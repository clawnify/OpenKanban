import { createApp, createRoute, z } from "@clawnify/app";
import { query, get, run } from "./db.js";

type Env = { Bindings: { DB: D1Database } };

const app = createApp<Env>({
  title: "OpenKanban",
  version: "1.0.0",
  description: "A kanban board with lists and cards for task management.",
});

// ── Colors ─────────────────────────────────────────────────────────

// Palette keys; the client maps each to its header and card shades
// (src/client/colors.ts). New lists take the next color in this order.
const COLOR_KEYS = ["indigo", "violet", "pink", "amber", "emerald", "cyan", "blue", "red"] as const;
const ColorSchema = z.enum(COLOR_KEYS).openapi({ description: "Palette color key" });

// Databases created before colors existed lack the `color` columns, and
// schema.sql can only create tables, so add them on the first API request.
// Lists without a color (older rows, demo/seed.sql) get the one they showed
// when colors rotated by position.
let colorsReady: Promise<void> | null = null;

async function prepareColors() {
  for (const table of ["lists", "cards"]) {
    const columns = await query<{ name: string }>(`PRAGMA table_info(${table})`);
    if (columns.some((col) => col.name === "color")) continue;
    try {
      await run(`ALTER TABLE ${table} ADD COLUMN color TEXT`);
    } catch (err) {
      // Another request added it first
      if (!/duplicate column/i.test((err as Error).message)) throw err;
    }
  }
  const lists = await query<{ id: number; color: string | null }>(
    "SELECT id, color FROM lists ORDER BY position ASC"
  );
  for (const [i, list] of lists.entries()) {
    if (list.color) continue;
    await run("UPDATE lists SET color = ? WHERE id = ? AND color IS NULL", [COLOR_KEYS[i % COLOR_KEYS.length], list.id]);
  }
}

app.use("/api/*", async (c, next) => {
  colorsReady ??= prepareColors().catch((err) => {
    colorsReady = null;
    throw err;
  });
  try {
    await colorsReady;
  } catch (err) {
    return c.json({ error: "Database upgrade failed: " + (err as Error).message }, 500);
  }
  await next();
});

// ── Shared Schemas ─────────────────────────────────────────────────

const ErrorSchema = z.object({ error: z.string() }).openapi("Error");
const OkSchema = z.object({ ok: z.boolean() }).openapi("Ok");

const ListSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  position: z.number().int(),
  color: ColorSchema.nullable(),
  created_at: z.string(),
}).openapi("List");

const CardSchema = z.object({
  id: z.number().int(),
  list_id: z.number().int(),
  title: z.string(),
  description: z.string(),
  position: z.number().int(),
  color: ColorSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
}).openapi("Card");

const ListWithCardsSchema = ListSchema.extend({
  cards: z.array(CardSchema),
}).openapi("ListWithCards");

const IdParam = z.object({ id: z.string().openapi({ description: "Resource ID (integer)" }) });

type ListRow = z.infer<typeof ListSchema>;
type CardRow = z.infer<typeof CardSchema>;

const LIST_COLUMNS = "id, title, position, color, created_at";
const CARD_COLUMNS = "id, list_id, title, description, position, color, created_at, updated_at";

// ── Lists ──────────────────────────────────────────────────────────

const listLists = createRoute({
  method: "get",
  path: "/api/lists",
  tags: ["Lists"],
  summary: "Get all lists with their cards",
  responses: {
    200: {
      description: "All lists with nested cards",
      content: { "application/json": { schema: z.object({ lists: z.array(ListWithCardsSchema) }) } },
    },
    500: { description: "Server error", content: { "application/json": { schema: ErrorSchema } } },
  },
});

app.openapi(listLists, async (c) => {
  try {
    const lists = await query<ListRow>(`SELECT ${LIST_COLUMNS} FROM lists ORDER BY position ASC`);
    const cards = await query<CardRow>(`SELECT ${CARD_COLUMNS} FROM cards ORDER BY position ASC`);

    const cardsByList = new Map<number, typeof cards>();
    for (const card of cards) {
      if (!cardsByList.has(card.list_id)) {
        cardsByList.set(card.list_id, []);
      }
      cardsByList.get(card.list_id)!.push(card);
    }

    const result = lists.map((list) => ({
      ...list,
      cards: cardsByList.get(list.id) || [],
    }));

    return c.json({ lists: result }, 200);
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

const createList = createRoute({
  method: "post",
  path: "/api/lists",
  tags: ["Lists"],
  summary: "Create a new list",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: z.object({
        title: z.string().min(1),
        color: ColorSchema.optional().openapi({ description: "Defaults to the next color in the palette" }),
      }) } },
    },
  },
  responses: {
    201: { description: "Created list", content: { "application/json": { schema: ListSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    500: { description: "Server error", content: { "application/json": { schema: ErrorSchema } } },
  },
});

app.openapi(createList, async (c) => {
  try {
    const body = c.req.valid("json");
    const title = body.title.trim();
    if (!title) return c.json({ error: "Title is required" }, 400);

    const stats = await get<{ max_pos: number; count: number }>(
      "SELECT COALESCE(MAX(position), -1) as max_pos, COUNT(*) as count FROM lists"
    );
    const nextPos = (stats?.max_pos ?? -1) + 1;
    const color = body.color ?? COLOR_KEYS[(stats?.count ?? 0) % COLOR_KEYS.length];

    await run("INSERT INTO lists (title, position, color) VALUES (?, ?, ?)", [title, nextPos, color]);
    const inserted = await get<ListRow>(
      `SELECT ${LIST_COLUMNS} FROM lists WHERE rowid = last_insert_rowid()`
    );
    if (!inserted) return c.json({ error: "Failed to read back created list" }, 500);

    return c.json(inserted, 201);
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

const updateList = createRoute({
  method: "put",
  path: "/api/lists/{id}",
  tags: ["Lists"],
  summary: "Rename a list or change its color",
  request: {
    params: IdParam,
    body: {
      required: true,
      content: { "application/json": { schema: z.object({
        title: z.string().min(1).optional(),
        color: ColorSchema.optional(),
      }) } },
    },
  },
  responses: {
    200: { description: "Updated list", content: { "application/json": { schema: ListSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    500: { description: "Server error", content: { "application/json": { schema: ErrorSchema } } },
  },
});

app.openapi(updateList, async (c) => {
  try {
    const { id: idStr } = c.req.valid("param");
    const id = parseInt(idStr, 10);
    const body = c.req.valid("json");

    const existing = await get<ListRow>(`SELECT ${LIST_COLUMNS} FROM lists WHERE id = ?`, [id]);
    if (!existing) return c.json({ error: "List not found" }, 404);

    const title = body.title !== undefined ? body.title.trim() : existing.title;
    if (!title) return c.json({ error: "Title is required" }, 400);
    const color = body.color ?? existing.color;

    await run("UPDATE lists SET title = ?, color = ? WHERE id = ?", [title, color, id]);

    const updated = await get<ListRow>(`SELECT ${LIST_COLUMNS} FROM lists WHERE id = ?`, [id]);
    if (!updated) return c.json({ error: "Failed to read back updated list" }, 500);
    return c.json(updated, 200);
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

const deleteList = createRoute({
  method: "delete",
  path: "/api/lists/{id}",
  tags: ["Lists"],
  summary: "Delete a list and all its cards",
  request: { params: IdParam },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: OkSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    500: { description: "Server error", content: { "application/json": { schema: ErrorSchema } } },
  },
});

app.openapi(deleteList, async (c) => {
  try {
    const { id: idStr } = c.req.valid("param");
    const id = parseInt(idStr, 10);

    const result = await run("DELETE FROM lists WHERE id = ?", [id]);
    if (result.changes === 0) return c.json({ error: "List not found" }, 404);

    return c.json({ ok: true }, 200);
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── Cards ──────────────────────────────────────────────────────────

const createCard = createRoute({
  method: "post",
  path: "/api/cards",
  tags: ["Cards"],
  summary: "Create a new card",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: z.object({
        list_id: z.number().int(),
        title: z.string().min(1),
        description: z.string().optional(),
        color: ColorSchema.optional(),
      }) } },
    },
  },
  responses: {
    201: { description: "Created card", content: { "application/json": { schema: CardSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "List not found", content: { "application/json": { schema: ErrorSchema } } },
    500: { description: "Server error", content: { "application/json": { schema: ErrorSchema } } },
  },
});

app.openapi(createCard, async (c) => {
  try {
    const body = c.req.valid("json");
    const title = body.title.trim();
    if (!title) return c.json({ error: "Title is required" }, 400);

    const list = await get("SELECT id FROM lists WHERE id = ?", [body.list_id]);
    if (!list) return c.json({ error: "List not found" }, 404);

    const maxPos = await get<{ max_pos: number }>(
      "SELECT COALESCE(MAX(position), -1) as max_pos FROM cards WHERE list_id = ?",
      [body.list_id]
    );
    const nextPos = (maxPos?.max_pos ?? -1) + 1;

    await run(
      "INSERT INTO cards (list_id, title, description, position, color) VALUES (?, ?, ?, ?, ?)",
      [body.list_id, title, (body.description || "").trim(), nextPos, body.color ?? null]
    );

    const inserted = await get<CardRow>(
      `SELECT ${CARD_COLUMNS} FROM cards WHERE rowid = last_insert_rowid()`
    );
    if (!inserted) return c.json({ error: "Failed to read back created card" }, 500);

    return c.json(inserted, 201);
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

const updateCard = createRoute({
  method: "put",
  path: "/api/cards/{id}",
  tags: ["Cards"],
  summary: "Update a card",
  request: {
    params: IdParam,
    body: {
      required: true,
      content: { "application/json": { schema: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        color: ColorSchema.nullable().optional().openapi({ description: "null removes the color" }),
      }) } },
    },
  },
  responses: {
    200: { description: "Updated card", content: { "application/json": { schema: CardSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    500: { description: "Server error", content: { "application/json": { schema: ErrorSchema } } },
  },
});

app.openapi(updateCard, async (c) => {
  try {
    const { id: idStr } = c.req.valid("param");
    const id = parseInt(idStr, 10);
    const body = c.req.valid("json");

    const existing = await get<{ id: number; title: string; description: string; color: string | null }>(
      "SELECT id, title, description, color FROM cards WHERE id = ?",
      [id]
    );
    if (!existing) return c.json({ error: "Card not found" }, 404);

    const newTitle = body.title !== undefined ? body.title.trim() : existing.title;
    const newDesc = body.description !== undefined ? body.description.trim() : existing.description;
    const newColor = body.color !== undefined ? body.color : existing.color;

    if (!newTitle) return c.json({ error: "Title cannot be empty" }, 400);

    await run(
      "UPDATE cards SET title = ?, description = ?, color = ?, updated_at = datetime('now') WHERE id = ?",
      [newTitle, newDesc, newColor, id]
    );

    const updated = await get<CardRow>(
      `SELECT ${CARD_COLUMNS} FROM cards WHERE id = ?`,
      [id]
    );
    if (!updated) return c.json({ error: "Failed to read back updated card" }, 500);

    return c.json(updated, 200);
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

const deleteCard = createRoute({
  method: "delete",
  path: "/api/cards/{id}",
  tags: ["Cards"],
  summary: "Delete a card",
  request: { params: IdParam },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: OkSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    500: { description: "Server error", content: { "application/json": { schema: ErrorSchema } } },
  },
});

app.openapi(deleteCard, async (c) => {
  try {
    const { id: idStr } = c.req.valid("param");
    const id = parseInt(idStr, 10);

    const result = await run("DELETE FROM cards WHERE id = ?", [id]);
    if (result.changes === 0) return c.json({ error: "Card not found" }, 404);

    return c.json({ ok: true }, 200);
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

const moveCard = createRoute({
  method: "post",
  path: "/api/cards/{id}/move",
  tags: ["Cards"],
  summary: "Move a card to a different list and position",
  request: {
    params: IdParam,
    body: {
      required: true,
      content: { "application/json": { schema: z.object({
        target_list_id: z.number().int(),
        position: z.number().int(),
      }) } },
    },
  },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: OkSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    500: { description: "Server error", content: { "application/json": { schema: ErrorSchema } } },
  },
});

app.openapi(moveCard, async (c) => {
  try {
    const { id: idStr } = c.req.valid("param");
    const id = parseInt(idStr, 10);
    const body = c.req.valid("json");

    const card = await get<{ id: number; list_id: number; position: number }>(
      "SELECT id, list_id, position FROM cards WHERE id = ?",
      [id]
    );
    if (!card) return c.json({ error: "Card not found" }, 404);

    const targetList = await get("SELECT id FROM lists WHERE id = ?", [body.target_list_id]);
    if (!targetList) return c.json({ error: "Target list not found" }, 404);

    await run(
      "UPDATE cards SET position = position + 1 WHERE list_id = ? AND position >= ? AND id != ?",
      [body.target_list_id, body.position, id]
    );

    await run(
      "UPDATE cards SET list_id = ?, position = ?, updated_at = datetime('now') WHERE id = ?",
      [body.target_list_id, body.position, id]
    );

    return c.json({ ok: true }, 200);
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

export default app;
