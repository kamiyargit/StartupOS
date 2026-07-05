import { cn } from "@/lib/utils";

type CostTypeBadgeProps = {
  name: string;
  color: string;
  className?: string;
  size?: "sm" | "md";
};

export function CostTypeBadge({ name, color, className, size = "md" }: CostTypeBadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn("shrink-0 rounded-full", size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3")}
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span>{name}</span>
    </span>
  );
}
