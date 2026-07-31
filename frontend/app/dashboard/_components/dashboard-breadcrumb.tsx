"use client";

import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useBreadcrumbStore } from "@/lib/breadcrumb/store";
import { routes } from "@/lib/routes";

export function DashboardBreadcrumb() {
  const items = useBreadcrumbStore((s) => s.items);

  if (items.length === 0) return null;

  const allItems = [{ label: "แดชบอร์ด", href: routes.dashboards.dashboard }, ...items];

  return (
    <Breadcrumb className="mb-2">
      <BreadcrumbList>
        {allItems.map((item, index) => (
          <Fragment key={index}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {item.loading ? (
                <Skeleton className="h-4 w-24" />
              ) : item.href ? (
                <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
