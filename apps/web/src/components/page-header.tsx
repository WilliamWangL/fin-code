import type { ReactNode } from "react";

import { Breadcrumb, type BreadcrumbItem } from "@/components/breadcrumb";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  breadcrumbs,
  badge,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {breadcrumbs && <Breadcrumb items={breadcrumbs} />}
      {badge}
      <div className="max-w-3xl space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="text-base text-muted-foreground text-pretty">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
