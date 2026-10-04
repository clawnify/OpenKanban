import { useState, useRef, useEffect } from "preact/hooks";
import { Plus } from "lucide-preact";
import { useBoard } from "../context";
import { ColorSwatches } from "./color-swatches";
import { nextListColor, type ColorKey } from "../colors";

export function Toolbar() {
  const { isAgent, board, addList, setError } = useBoard();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  // null: let the server pick the next palette color
  const [color, setColor] = useState<ColorKey | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showForm && inputRef.current) inputRef.current.focus();
  }, [showForm]);

  const handleAdd = () => {
    const val = title.trim();
    if (!val) return;
    addList(val, color ?? undefined)
      .then(() => {
        setTitle("");
        setColor(null);
        setShowForm(false);
      })
      .catch((err) => setError((err as Error).message));
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") {
      setShowForm(false);
      setTitle("");
      setColor(null);
    }
  };

  return (
    <header class="toolbar">
      <h1 class="toolbar-title">Kanban Board</h1>
      <div class="toolbar-right">
        {!showForm && (
          <button
            class="btn btn-primary"
            onClick={() => setShowForm(true)}
            aria-label="Add new list"
          >
            <Plus size={16} /> Add List
          </button>
        )}
        {showForm && (
          <div class="add-list-popover">
            <div class="inline-form">
              {isAgent && <label for="new-list-input">List title</label>}
              <input
                ref={inputRef}
                id="new-list-input"
                type="text"
                placeholder="List title"
                value={title}
                onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
                onKeyDown={handleKeyDown}
                aria-label="New list title"
              />
              <ColorSwatches
                value={color ?? nextListColor(board.length)}
                onChange={(c) => c && setColor(c)}
                label="List color"
                variant="header"
              />
              <div class="inline-form-row">
                <button class="btn btn-primary btn-sm" onClick={handleAdd} aria-label="Save new list">
                  Add
                </button>
                <button
                  class="btn btn-sm"
                  onClick={() => {
                    setShowForm(false);
                    setTitle("");
                    setColor(null);
                  }}
                  aria-label="Cancel"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
