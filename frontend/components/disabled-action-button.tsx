"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const COMING_SOON_MESSAGE = "ฟีเจอร์นี้ยังไม่เปิดใช้งาน";

export function DisabledActionButton({
  icon: Icon,
  label,
  iconClassName,
}: {
  icon: LucideIcon;
  label: string;
  iconClassName?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" tabIndex={0} />}>
        <Button
          variant="outline"
          aria-label={label}
          disabled
          className="size-8 px-1.5 pt-px rounded-md bg-white disabled:cursor-not-allowed"
        >
          <Icon className={iconClassName ?? "w-4 h-4 text-gray-500"} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{COMING_SOON_MESSAGE}</TooltipContent>
    </Tooltip>
  );
}
