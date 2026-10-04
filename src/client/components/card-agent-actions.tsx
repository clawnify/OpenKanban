import { Pencil, Trash2 } from "lucide-preact";
import { useBoard } from "../context";
import { COLOR_KEYS, COLORS, type ColorKey } from "../colors";
import type { Card } from "../types";
import type { JSX } from "preact";

interface CardAgentActionsProps {
  card: Card;
  listId: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function CardAgentActions({ card, listId, onEdit, onDelete }: CardAgentActionsProps) {
  const { board, moveCard, setCardColor, setError } = useBoard();

  const handleMove = (e: JSX.TargetedEvent<HTMLSelectElement>) => {
    const targetListId = parseInt((e.target as HTMLSelectElement).value, 10);
    if (!targetListId) return;
    const targetList = board.find((l) => l.id === targetListId);
    const index = targetList ? targetList.cards.length : 0;
    moveCard(card.id, targetListId, index).catch((err) =>
      setError("Move failed: " + (err as Error).message),
    );
  };

  const handleColor = (e: JSX.TargetedEvent<HTMLSelectElement>) => {
    const value = (e.target as HTMLSelectElement).value;
    setCardColor(card.id, (value || null) as ColorKey | null).catch((err) =>
      setError((err as Error).message),
    );
  };

  return (
    <div class="card-actions agent-only" style={{ display: "flex" }}>
      {board.length > 1 && (
        <select
          class="card-move-select"
          onChange={handleMove}
          aria-label="Move card to list"
        >
          <option value="">Move to...</option>
          {board
            .filter((l) => l.id !== listId)
            .map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
        </select>
      )}
      <select
        class="card-move-select"
        value={card.color ?? ""}
        onChange={handleColor}
        aria-label={`Color of card ${card.title}`}
      >
        <option value="">No color</option>
        {COLOR_KEYS.map((key) => (
          <option key={key} value={key}>{COLORS[key].label}</option>
        ))}
      </select>
      <button class="btn btn-sm" onClick={onEdit} aria-label={`Edit card ${card.title}`}>
        <Pencil size={14} /> Edit
      </button>
      <button class="btn btn-sm btn-danger" onClick={onDelete} aria-label={`Delete card ${card.title}`}>
        <Trash2 size={14} /> Delete
      </button>
    </div>
  );
}
