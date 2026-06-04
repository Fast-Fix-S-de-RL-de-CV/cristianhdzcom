import { cn } from "@/lib/cn";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "ghost" | "accent" | "warm";
type Size = "default" | "lg" | "sm";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  shine?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "default", shine, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "btn",
        variant === "primary" && "btn-primary",
        variant === "ghost" && "btn-ghost",
        variant === "accent" && "btn-accent",
        variant === "warm" && "btn-warm",
        size === "lg" && "btn-lg",
        size === "sm" && "!py-2 !px-3 !text-xs",
        shine && "shine",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
