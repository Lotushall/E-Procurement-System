import { cn } from "@/lib/utils";
import { ReactNode } from "react";

const COL_SPAN_CLASSES: Record<number, string> = {
  1: "sm:col-span-1",
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
};

export const InputField = ({
  label,
  cols,
  labelClassName = "text-sm font-semibold tracking-wider",
  error,
  warning,
  required,
  badge,
  children,
}: {
  label: string;
  cols?: number;
  labelClassName?: string;
  error?: string;
  warning?: boolean;
  required?: boolean;
  badge?: ReactNode;
  children: ReactNode;
}) => (
  <div className={cn("flex flex-col gap-1.5", cols && COL_SPAN_CLASSES[cols])}>
    <div className="flex items-center gap-1.5">
      <p className={labelClassName}>{label}</p>
      {required && <span className="text-red-600">*</span>}
      {warning && <span className="w-1.75 h-1.75 rounded-full bg-red-600" />}
      {badge}
    </div>

    {children}

    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);
