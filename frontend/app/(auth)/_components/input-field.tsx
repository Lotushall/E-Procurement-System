import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export const InputField = ({
    label,
    full,
    labelClassName = "font-medium tracking-wider",
    error,
    children,
}: {
    label: string;
    full?: boolean;
    labelClassName?: string;
    error?: string;
    children: ReactNode;
}) => (
    <div className={cn("flex flex-col gap-1.5", full && "sm:col-span-2")}>
        <div className="flex gap-1">
            <p className={labelClassName}>{label}</p>
            <span className="text-red-600">*</span>
        </div>

        {children}

        {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
);
