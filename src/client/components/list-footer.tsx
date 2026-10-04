import { useState, useRef, useEffect } from "preact/hooks";
import { Plus } from "lucide-preact";
import { useBoard } from "../context";
import type { List } from "../types";

interface ListFooterProps {
  list: List;
}

export function ListFooter({ list }: ListFooterProps) {
  const { isAgent, addCard, setError } = useBoard();
  const [showForm, setShowForm] = useState(false);
  const [showDesc, setShowDesc] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const footerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showForm && titleRef.current) titleRef.current.focus();
  }, [showForm]);

  useEffect(() => {
    if (showDesc && descRef.current) descRef.current.focus();
  }, [showDesc]);

  const close = () => {
    setShowForm(false);
    setShowDesc(false);
    setTitle("");
    setDescription("");
  };

  const scrollToNewCard = () => {
    const cards = footerRef.current?.closest(".list")?.querySelector(".list-cards");
    if (cards) requestAnimationFrame(() => (cards.scrollTop = cards.scrollHeight));
  };

  const handleAdd = () => {
    // Read from the inputs (not state) so fast typing followed by Enter
    // never submits a stale value from before the last re-render
    const t = (titleRef.current?.value ?? title).trim();
    const d = (descRef.current?.value ?? description).trim();
    if (!t) {
      titleRef.current?.focus();
      return;
    }
    addCard(list.id, t, d || undefined)
      .then(scrollToNewCard)
      .catch((err) => setError((err as Error).message));
    setTitle("");
    setDescription("");
    // Human mode: stay open, ready for the next card
    setShowDesc(false);
    titleRef.current?.focus();
  };

  // Enter adds the card; Shift+Enter is a new line in the description
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === "Escape") close();
  };

  return (
    <div class="list-footer" ref={footerRef}>
      {/* Human mode */}
      {!isAgent && !showForm && (
        <div class="human-only">
          <button
            class="btn btn-sm"
            style={{ width: "100%" }}
            onClick={() => setShowForm(true)}
            aria-label={`Add card to ${list.title}`}
          >
            <Plus size={14} /> Add Card
          </button>
        </div>
      )}

      {!isAgent && showForm && (
        <div class="inline-form human-only">
          <input
            ref={titleRef}
            type="text"
            placeholder="Card title"
            value={title}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
            onKeyDown={handleKeyDown}
            aria-label="Card title"
          />
          {showDesc ? (
            <textarea
              ref={descRef}
              placeholder="Description (optional)"
              value={description}
              onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
              onKeyDown={handleKeyDown}
              aria-label="Card description"
            />
          ) : (
            <button class="btn-link" onClick={() => setShowDesc(true)} aria-label="Add description">
              <Plus size={12} /> Add description
            </button>
          )}
          <div class="inline-form-row">
            <button class="btn btn-primary btn-sm" onClick={handleAdd} aria-label="Add card">
              Add
            </button>
            <button class="btn btn-sm" onClick={close} aria-label="Cancel">
              Cancel
            </button>
          </div>
          <div class="form-hint">Enter to add · Shift+Enter for a new line · Esc to close</div>
        </div>
      )}

      {/* Agent mode: always-visible form with labels */}
      {isAgent && (
        <div class="agent-only-block agent-only" style={{ display: "block" }}>
          <div class="inline-form">
            <label for={`agent-card-title-${list.id}`}>New card title</label>
            <input
              id={`agent-card-title-${list.id}`}
              type="text"
              placeholder="Card title"
              value={title}
              onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
              aria-label={`New card title for ${list.title}`}
            />
            <label for={`agent-card-desc-${list.id}`}>Description (optional)</label>
            <input
              id={`agent-card-desc-${list.id}`}
              type="text"
              placeholder="Description"
              value={description}
              onInput={(e) => setDescription((e.target as HTMLInputElement).value)}
              aria-label={`New card description for ${list.title}`}
            />
            <button
              class="btn btn-primary btn-sm"
              onClick={handleAdd}
              aria-label={`Add card to ${list.title}`}
            >
              Add Card
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
