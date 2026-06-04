import { cn } from "@/lib/cn";

export function ProgressBar({
  value,
  className,
  trackClassName,
  fillClassName,
}: {
  value: number; // 0..100
  className?: string;
  trackClassName?: string;
  fillClassName?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("bar", trackClassName, className)}>
      <i className={fillClassName} style={{ width: `${v}%` }} />
    </div>
  );
}
