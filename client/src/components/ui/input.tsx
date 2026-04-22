import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-full border border-white/10 bg-white/5 px-4 text-sm text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:border-primary/60",
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";
