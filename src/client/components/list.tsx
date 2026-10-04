import { useBoard } from "../context";
import { useDrag } from "../hooks/use-drag";
import { ListHeader } from "./list-header";
import { CardList } from "./card-list";
import { ListFooter } from "./list-footer";
import { nextListColor } from "../colors";
import type { List as ListType } from "../types";

interface ListProps {
  list: ListType;
  index: number;
}

export function List({ list, index }: ListProps) {
  // The server gives every list a color; the fallback covers a demo seed
  // loaded while the server was running
  const color = list.color ?? nextListColor(index);
  const { isAgent } = useBoard();
  const { dragging, over, listHandlers } = useDrag();
  const handlers = isAgent ? {} : listHandlers(list);
  const isOver = dragging !== null && over?.listId === list.id;

  return (
    <div
      class={`list${isOver ? " drag-over" : ""}`}
      data-list-id={list.id}
      role="region"
      aria-label={`List: ${list.title}`}
      {...handlers}
    >
      <ListHeader list={list} color={color} />
      <CardList list={list} />
      <ListFooter list={list} />
    </div>
  );
}
