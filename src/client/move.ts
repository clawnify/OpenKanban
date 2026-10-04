import type { BoardData } from "./types";

export interface MovePlan {
  board: BoardData;
  /** Position value to send to POST /api/cards/:id/move */
  position: number;
}

/**
 * Plan moving a card so it ends up at `index` among the target list's other
 * cards. Positions in the DB can have gaps, so the server position is taken
 * from the card being displaced (or one past the last card), and the returned
 * board mirrors the server's "shift everything at or after it down" logic.
 * Returns null when the move would not change anything.
 */
export function planMove(board: BoardData, cardId: number, toListId: number, index: number): MovePlan | null {
  const from = board.find((l) => l.cards.some((c) => c.id === cardId));
  const to = board.find((l) => l.id === toListId);
  if (!from || !to) return null;

  const card = from.cards.find((c) => c.id === cardId)!;
  const others = to.cards.filter((c) => c.id !== cardId);
  const i = Math.max(0, Math.min(index, others.length));
  if (from.id === to.id && from.cards.indexOf(card) === i) return null;

  const displaced = others[i];
  const position = displaced ? displaced.position : others.length ? others[others.length - 1].position + 1 : 0;

  const shifted = others.map((c) => (c.position >= position ? { ...c, position: c.position + 1 } : c));
  shifted.splice(i, 0, { ...card, list_id: toListId, position });

  return {
    position,
    board: board.map((l) => {
      if (l.id === to.id) return { ...l, cards: shifted };
      if (l.id === from.id) return { ...l, cards: l.cards.filter((c) => c.id !== cardId) };
      return l;
    }),
  };
}

/**
 * Index among a list's cards (excluding the dragged one) where a drop at
 * `clientY` would land: before the first card whose midpoint is below it.
 */
export function dropIndexAt(clientY: number, container: Element, draggedId: number): number {
  const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-card-id]")).filter(
    (el) => Number(el.dataset.cardId) !== draggedId,
  );
  const i = cards.findIndex((el) => {
    const r = el.getBoundingClientRect();
    return clientY < r.top + r.height / 2;
  });
  return i === -1 ? cards.length : i;
}
