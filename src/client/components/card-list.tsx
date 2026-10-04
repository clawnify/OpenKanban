import { useDrag } from "../hooks/use-drag";
import { Card } from "./card";
import type { List } from "../types";

interface CardListProps {
  list: List;
}

export function CardList({ list }: CardListProps) {
  const { dragging, over } = useDrag();

  // Drop indicator: a line before the card being displaced, or after the last card
  const target = over?.listId === list.id ? over.index : null;
  const others = list.cards.filter((c) => c.id !== dragging?.cardId);
  const hintFor = (cardId: number): "before" | "after" | undefined => {
    if (target === null) return undefined;
    if (others[target]?.id === cardId) return "before";
    if (target === others.length && others[others.length - 1]?.id === cardId) return "after";
    return undefined;
  };

  return (
    <div class="list-cards" data-list-id={list.id}>
      {list.cards.length === 0 ? (
        <div class="list-empty">No cards yet</div>
      ) : (
        list.cards.map((card) => (
          <Card key={card.id} card={card} listId={list.id} dropHint={hintFor(card.id)} />
        ))
      )}
    </div>
  );
}
