"use client"

import type { Column } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function SortableHeader<TData>({
    column,
    label,
    align = "left",
}: {
    column: Column<TData, unknown>
    label: string
    align?: "left" | "center"
}) {
    const sorted = column.getIsSorted()
    return (
        <div className={cn("flex items-center", align === "center" && "justify-center")}>
            <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8"
                onClick={() => column.toggleSorting()}
            >
                {label}
                {sorted === "asc" ? (
                    <ArrowUp className="ml-1.5 size-3.5" />
                ) : sorted === "desc" ? (
                    <ArrowDown className="ml-1.5 size-3.5" />
                ) : (
                    <ArrowUpDown className="ml-1.5 size-3.5 text-muted-foreground" />
                )}
            </Button>
        </div>
    )
}
