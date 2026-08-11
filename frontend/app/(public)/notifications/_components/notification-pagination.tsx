"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotificationPaginationProps {
  currentPage: number;
  lastPage: number;
  onPageChange: (page: number) => void;
}

export function NotificationPagination({
  currentPage,
  lastPage,
  onPageChange,
}: NotificationPaginationProps) {
  if (lastPage <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        <ChevronLeft />
        ก่อนหน้า
      </Button>

      <p className="text-sm text-muted-foreground">
        หน้า {currentPage} จาก {lastPage}
      </p>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= lastPage}
      >
        ถัดไป
        <ChevronRight />
      </Button>
    </div>
  );
}
