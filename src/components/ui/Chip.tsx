import { cn } from "@/lib/cn";
import { HTMLAttributes } from "react";

type Variant = "default" | "accent" | "warm" | "ink" | "green";
interface Props extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  dot?: boolean;
  pulse?: boolean;
}
export function Chip({ className, variant = "default", dot, pulse, children, ...rest }: Props) {
  return (
    <span
      className={cn(
        "chip",
        variant === "accent" && "chip-accent",
        variant === "warm" && "chip-warm",
        variant === "ink" && "chip-ink",
        variant === "green" && "chip-green",
        dot && "chip-dot",
        pulse && "pulse",
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
