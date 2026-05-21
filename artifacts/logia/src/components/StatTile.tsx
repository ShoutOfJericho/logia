import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatTileProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: ReactNode;
  testId?: string;
  accent?: "primary" | "accent" | "muted";
}

export function StatTile({
  label,
  value,
  icon: Icon,
  hint,
  testId,
  accent = "primary",
}: StatTileProps) {
  const tone =
    accent === "accent"
      ? "text-accent"
      : accent === "muted"
      ? "text-muted-foreground"
      : "text-primary";
  return (
    <Card data-testid={testId} className="paper">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          {Icon && <Icon className={`h-4 w-4 ${tone}`} />}
        </div>
        <div className="font-serif text-3xl mt-2 text-foreground tabular-nums">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}
