"use client";

import { useEffect } from "react";
import { useBreadcrumbStore, type BreadcrumbItem } from "./store";

export function useBreadcrumb(items: BreadcrumbItem[]) {
  const setItems = useBreadcrumbStore((s) => s.setItems);
  const clear = useBreadcrumbStore((s) => s.clear);
  const key = JSON.stringify(items);

  useEffect(() => {
    setItems(items);
    return () => clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key already captures items' content
  }, [key]);
}
