import type { ElementType } from "react";

import { cn } from "@/lib/utils";

export function Metric({
  label,
  value,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: string;
  icon?: ElementType;
  iconClassName?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      {Icon ? (
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
            iconClassName,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </div>
  );
}
