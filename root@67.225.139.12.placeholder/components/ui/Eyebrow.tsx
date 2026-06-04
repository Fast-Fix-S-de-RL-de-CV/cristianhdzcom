import { cn } from "@/lib/cn";
import { HTMLAttributes } from "react";
export function Eyebrow({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("eyebrow", className)} {...rest} />;
}
