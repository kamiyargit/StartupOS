import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  id?: string;
  className?: string;
};

export function ColorPicker({ value, onChange, id, className }: ColorPickerProps) {
  const safeValue = value || "#059669";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        id={id}
        type="color"
        value={safeValue}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 dark:border-gh-border dark:bg-gh-canvas-subtle"
        aria-label="انتخاب رنگ"
      />
      <span className="text-xs text-slate-500 dark:text-gh-fg-muted" dir="ltr">
        {safeValue}
      </span>
    </div>
  );
}

export function ColorPickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <ColorPicker value={value} onChange={onChange} />
    </div>
  );
}
