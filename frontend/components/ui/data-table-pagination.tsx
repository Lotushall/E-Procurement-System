import { type Table } from "@tanstack/react-table"
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Separator } from "./separator"

interface DataTablePaginationProps<TData> {
    table: Table<TData>
    total: number
}

type PageItem = number | "left-ellipsis" | "right-ellipsis"

function getPageItems(current: number, total: number, siblingCount = 1): PageItem[] {
    const totalSlots = siblingCount * 2 + 5
    if (totalSlots >= total) {
        return Array.from({ length: total }, (_, i) => i + 1)
    }

    const left = Math.max(current - siblingCount, 1)
    const right = Math.min(current + siblingCount, total)
    const showLeftEllipsis = left > 2
    const showRightEllipsis = right < total - 1

    if (!showLeftEllipsis && showRightEllipsis) {
        const count = 3 + siblingCount * 2
        return [...Array.from({ length: count }, (_, i) => i + 1), "right-ellipsis", total]
    }

    if (showLeftEllipsis && !showRightEllipsis) {
        const count = 3 + siblingCount * 2
        return [1, "left-ellipsis", ...Array.from({ length: count }, (_, i) => total - count + 1 + i)]
    }

    return [1, "left-ellipsis", ...Array.from({ length: right - left + 1 }, (_, i) => left + i), "right-ellipsis", total]
}

export function DataTablePagination<TData>({
    table,
    total,
}: DataTablePaginationProps<TData>) {
    const { pageSize } = table.getState().pagination
    const currentPage = table.getState().pagination.pageIndex + 1
    const pageCount = Math.max(table.getPageCount(), 1)
    const pageItems = getPageItems(currentPage, pageCount)

    return (
        <div className="flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-1.5 *:bg-white">
                    <Button
                        variant="outline"
                        size="icon"
                        className="hidden size-8 rounded-sm lg:flex"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <span className="sr-only">Go to first page</span>
                        <ChevronsLeft />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-8 rounded-full sm:rounded-sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <span className="sr-only">Go to previous page</span>
                        <ChevronLeft />
                    </Button>

                    {pageItems.map((item) =>
                        typeof item === "number" ? (
                            <Button
                                key={item}
                                variant={item === currentPage ? "default" : "outline"}
                                size="icon"
                                className={cn(
                                    "size-8 rounded-full sm:rounded-sm",
                                    item === currentPage &&
                                        "bg-black! text-white! hover:bg-black/90 sm:bg-red-700! sm:hover:bg-red-700/90",
                                )}
                                onClick={() => table.setPageIndex(item - 1)}
                            >
                                {item}
                            </Button>
                        ) : (
                            <span
                                key={item}
                                className="flex size-8 items-center justify-center text-sm text-muted-foreground bg-transparent!"
                            >
                                …
                            </span>
                        ),
                    )}
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-8 rounded-full sm:rounded-sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <span className="sr-only">Go to next page</span>
                        <ChevronRight />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="hidden size-8 rounded-sm lg:flex"
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                    >
                        <span className="sr-only">Go to last page</span>
                        <ChevronsRight />
                    </Button>
                </div>

                <div className="hidden items-center gap-2 sm:flex">
                    <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Found {total} results</span>
                    </div>

                    <Separator orientation="vertical" />
                </div>

                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Rows per page</p>
                    <Select
                        value={`${pageSize}`}
                        onValueChange={(value) => table.setPageSize(Number(value))}
                    >
                        <SelectTrigger className="h-8 w-17.5 bg-white rounded-sm">
                            <SelectValue placeholder={pageSize} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 20, 25, 30, 40, 50].map((size) => (
                                <SelectItem key={size} value={`${size}`}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    )
}
