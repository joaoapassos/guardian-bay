"use client";

export function QuantitySelector({
  id,
  label = "Quantidade",
  value,
  onChange,
  disabled,
  describedBy,
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  describedBy?: string;
}) {
  const number = Number(value);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <div className="inline-flex rounded-control border border-muted bg-surface focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-coast">
        <button
          type="button"
          aria-label={`Diminuir ${label.toLowerCase()}`}
          aria-controls={id}
          disabled={disabled || !Number.isInteger(number) || number <= 1}
          onClick={() => onChange(String(number - 1))}
          className="min-h-11 w-11 rounded-l-control text-xl text-coast focus-visible:outline-2 focus-visible:outline-coast disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <input
          id={id}
          name="quantity"
          type="number"
          inputMode="numeric"
          min={1}
          max={99}
          step={1}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          aria-describedby={describedBy}
          className="min-h-11 w-16 border-x border-line bg-transparent px-2 text-center tabular-nums focus-visible:outline-2 focus-visible:outline-coast disabled:opacity-50"
        />
        <button
          type="button"
          aria-label={`Aumentar ${label.toLowerCase()}`}
          aria-controls={id}
          disabled={disabled || !Number.isInteger(number) || number >= 99}
          onClick={() => onChange(String(number + 1))}
          className="min-h-11 w-11 rounded-r-control text-xl text-coast focus-visible:outline-2 focus-visible:outline-coast disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}
