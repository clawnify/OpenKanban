import { createContext } from "preact";
import { useState, useCallback, useContext } from "preact/hooks";
import type { JSX } from "preact";
import { dropIndexAt } from "../move";
import type { List } from "../types";

export interface DragSource {
  cardId: number;
  fromListId: number;
}

export interface DropTarget {
  listId: number;
  /** Index among the list's cards, excluding the dragged card */
  index: number;
}

type DragEvent = JSX.TargetedDragEvent<HTMLElement>;

export interface DragContextValue {
  dragging: DragSource | null;
  over: DropTarget | null;
  startDrag: (cardId: number, fromListId: number, e: DragEvent) => void;
  endDrag: () => void;
  listHandlers: (list: List) => {
    onDragOver: (e: DragEvent) => void;
    onDragLeave: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
  };
}

/**
 * Board-wide drag state, so a card picked up in one list can be dropped in
 * another. The whole list (header, cards, footer) is a drop zone.
 */
export function useDragState(
  moveCard: (cardId: number, targetListId: number, index: number) => Promise<void>,
  onError: (msg: string) => void,
): DragContextValue {
  const [dragging, setDragging] = useState<DragSource | null>(null);
  const [over, setOver] = useState<DropTarget | null>(null);

  const startDrag = useCallback((cardId: number, fromListId: number, e: DragEvent) => {
    e.dataTransfer!.effectAllowed = "move";
    // Firefox won't start a drag without data
    e.dataTransfer!.setData("text/plain", String(cardId));
    setDragging({ cardId, fromListId });
  }, []);

  const endDrag = useCallback(() => {
    setDragging(null);
    setOver(null);
  }, []);

  const listHandlers = useCallback(
    (list: List) => {
      const targetAt = (e: DragEvent): DropTarget | null => {
        if (!dragging) return null;
        const cardsEl = e.currentTarget.querySelector(".list-cards");
        const index = cardsEl ? dropIndexAt(e.clientY, cardsEl, dragging.cardId) : 0;
        // Dropping a card back where it started is a no-op; show no indicator
        if (list.id === dragging.fromListId && list.cards.findIndex((c) => c.id === dragging.cardId) === index) {
          return null;
        }
        return { listId: list.id, index };
      };

      return {
        onDragOver: (e: DragEvent) => {
          if (!dragging) return;
          e.preventDefault();
          e.dataTransfer!.dropEffect = "move";
          const next = targetAt(e);
          setOver((prev) =>
            prev?.listId === next?.listId && prev?.index === next?.index ? prev : next,
          );
        },
        onDragLeave: (e: DragEvent) => {
          // dragleave also fires when moving between child elements, and
          // Chromium often reports relatedTarget as null, so check the pointer
          const r = e.currentTarget.getBoundingClientRect();
          if (e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) return;
          setOver((prev) => (prev?.listId === list.id ? null : prev));
        },
        onDrop: (e: DragEvent) => {
          e.preventDefault();
          const target = targetAt(e);
          const source = dragging;
          endDrag();
          if (!source || !target) return;
          moveCard(source.cardId, target.listId, target.index).catch((err) =>
            onError("Move failed: " + (err as Error).message),
          );
        },
      };
    },
    [dragging, endDrag, moveCard, onError],
  );

  return { dragging, over, startDrag, endDrag, listHandlers };
}

export const DragContext = createContext<DragContextValue>(null!);

export function useDrag() {
  return useContext(DragContext);
}
