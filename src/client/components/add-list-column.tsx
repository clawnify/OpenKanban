import { useState, useRef, useEffect } from "preact/hooks";
import { Plus } from "lucide-preact";
import { useBoard } from "../context";

/** Trello-style "Add list" column at the end of the board. */
export function AddListColumn() {
  const { isAgent, board, addList, setError } = useBoard();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const columnRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showForm && inputRef.current) inputRef.current.focus();
  }, [showForm]);

  const close = () => {
    setShowForm(false);
    setTitle("");
  };

  // Keep this column in view as new lists push it to the right
  const scrollToEnd = () => {
    const boardEl = columnRef.current?.closest(".board");
    if (boardEl) requestAnimationFrame(() => (boardEl.scrollLeft = boardEl.scrollWidth));
  };

  const handleAdd = () => {
    // Read from the input (not state) so fast typing followed by Enter
    // never submits a stale value from before the last re-render
    const val = (inputRef.current?.value ?? title).trim();
    if (!val) {
      inputRef.current?.focus();
      return;
    }
    addList(val)
      .then(scrollToEnd)
      .catch((err) => setError((err as Error).message));
    // Stay open, ready for the next list
    setTitle("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.isComposing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === "Escape") close();
  };

  return (
    <div class="add-list-column" ref={columnRef}>
      {!showForm ? (
        <button
          class="add-list-trigger"
          onClick={() => setShowForm(true)}
          aria-label="Add list at end of board"
        >
          <Plus size={16} /> {board.length === 0 ? "Add a list" : "Add another list"}
        </button>
      ) : (
        <div class="add-list-form inline-form">
          {isAgent && <label for="add-list-column-input">List title</label>}
          <input
            ref={inputRef}
            id="add-list-column-input"
            type="text"
            placeholder="List title"
            value={title}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
            onKeyDown={handleKeyDown}
            aria-label="Title for new list at end of board"
          />
          <div class="inline-form-row">
            <button class="btn btn-primary btn-sm" onClick={handleAdd} aria-label="Add list">
              Add list
            </button>
            <button class="btn btn-sm" onClick={close} aria-label="Cancel adding list">
              Cancel
            </button>
          </div>
          {!isAgent && <div class="form-hint">Enter to add · Esc to close</div>}
        </div>
      )}
    </div>
  );
}
