import { cn } from "@/lib/cn";
import { HTMLAttributes, forwardRef } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}
export const Card = forwardRef<HTMLDivElement, Props>(function Card({ className, hover, ...rest }, ref) {
  return <div ref={ref} className={cn("card", hover && "card-hover", className)} {...rest} />;
});
