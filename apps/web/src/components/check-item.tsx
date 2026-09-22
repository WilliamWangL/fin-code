import { CheckCircle2, Info, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export function CheckItem({
  passed,
  pending,
  label,
  detail,
}: {
  passed: boolean;
  pending?: boolean;
  label: string;
  detail?: string;
}) {
  const Icon = pending ? Info : passed ? CheckCircle2 : XCircle;
  return (
    <li className="flex items-start gap-3 py-2.5">
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          pending ? "text-muted-foreground" : passed ? "text-success" : "text-destructive",
        )}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {detail && (
          <p className="text-xs text-muted-foreground break-words">{detail}</p>
        )}
      </div>
    </li>
  );
}
