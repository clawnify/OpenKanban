import { useBoard } from "../context";
import { DragContext, useDragState } from "../hooks/use-drag";
import { List } from "./list";
import { AddListColumn } from "./add-list-column";

export function Board() {
  const { board, loading, moveCard, setError } = useBoard();
  const drag = useDragState(moveCard, setError);

  return (
    <DragContext.Provider value={drag}>
      <div class="board" id="board">
        {loading && board.length === 0 ? (
          <div class="board-loading">Loading board...</div>
        ) : (
          <>
            {board.map((list, i) => <List key={list.id} list={list} index={i} />)}
            <AddListColumn />
          </>
        )}
      </div>
    </DragContext.Provider>
  );
}
