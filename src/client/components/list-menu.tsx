import { useState, useRef, useEffect } from "preact/hooks";
import { Ellipsis, Pencil, Trash2 } from "lucide-preact";
import { ColorSwatches } from "./color-swatches";
import type { ColorKey } from "../colors";

interface ListMenuProps {
  listTitle: string;
  color: ColorKey;
  onRename: () => void;
  onColor: (color: ColorKey) => void;
  onDelete: () => void;
}

/** "…" menu on a list header: Rename / Color / Delete */
export function ListMenu({ listTitle, color, onRename, onColor, onDelete }: ListMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on a click outside the menu or on Escape
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const pick = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  return (
    <div class="list-menu" ref={rootRef}>
      <button
        class="btn btn-ghost btn-sm"
        onClick={() => setOpen(!open)}
        aria-label={`List options for ${listTitle}`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Ellipsis size={16} />
      </button>
      {open && (
        <div class="list-menu-popover" role="menu" aria-label={`Options for ${listTitle}`}>
          <button class="list-menu-item" role="menuitem" onClick={pick(onRename)}>
            <Pencil size={14} /> Rename
          </button>
          <div class="list-menu-section">
            <div class="list-menu-label">Color</div>
            {/* Stays open so colors can be compared */}
            <ColorSwatches
              value={color}
              onChange={(c) => c && onColor(c)}
              label="List color"
              variant="header"
            />
          </div>
          <button class="list-menu-item danger" role="menuitem" onClick={pick(onDelete)}>
            <Trash2 size={14} /> Delete list
          </button>
        </div>
      )}
    </div>
  );
}
