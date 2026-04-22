import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Tabs({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("inline-flex flex-wrap gap-2", className)}>{children}</div>;
}

export function TabButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-medium transition",
        active
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          : "border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
