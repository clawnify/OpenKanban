import { COLOR_KEYS, COLORS, type ColorKey } from "../colors";

interface ColorSwatchesProps {
  value: ColorKey | null;
  onChange: (color: ColorKey | null) => void;
  /** Accessible name for the group, e.g. "List color" */
  label: string;
  /** "header" shows the strong list shades, "card" the light card shades */
  variant: "header" | "card";
  /** Offer a "No color" swatch (cards only) */
  allowNone?: boolean;
}

export function ColorSwatches({ value, onChange, label, variant, allowNone }: ColorSwatchesProps) {
  return (
    <div class="color-swatches" role="radiogroup" aria-label={label}>
      {allowNone && (
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          class={`swatch swatch-none${value === null ? " selected" : ""}`}
          onClick={() => onChange(null)}
          aria-label="No color"
          title="No color"
        />
      )}
      {COLOR_KEYS.map((key) => {
        const c = COLORS[key];
        const style = variant === "header"
          ? { background: c.header }
          : { background: c.cardBg, borderColor: c.cardBorder };
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={value === key}
            class={`swatch${value === key ? " selected" : ""}`}
            style={style}
            onClick={() => onChange(key)}
            aria-label={c.label}
            title={c.label}
          />
        );
      })}
    </div>
  );
}
