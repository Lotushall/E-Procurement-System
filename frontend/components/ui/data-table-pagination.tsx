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

function getPageItems(
    current: number,
    total: number,
    siblingCount = 2,
    edgeCount = 3 + siblingCount * 2,
): PageItem[] {
    const totalSlots = siblingCount * 2 + 5
    if (totalSlots >= total) {
        return Array.from({ length: total }, (_, i) => i + 1)
    }

    const left = Math.max(current - siblingCount, 1)
    const right = Math.min(current + siblingCount, total)
    const showLeftEllipsis = left > 2
    const showRightEllipsis = right < total - 1

    if (!showLeftEllipsis && showRightEllipsis) {
        return [...Array.from({ length: edgeCount }, (_, i) => i + 1), "right-ellipsis", total]
    }

    if (showLeftEllipsis && !showRightEllipsis) {
        return [1, "left-ellipsis", ...Array.from({ length: edgeCount }, (_, i) => total - edgeCount + 1 + i)]
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
    const mobilePageItems = getPageItems(currentPage, pageCount, 1, 4)
    const desktopPageItems = getPageItems(currentPage, pageCount, 2)

    return (
        <div className="flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-nowrap items-center gap-1 sm:gap-1.5 *:bg-white">
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
                        className="size-7! rounded-full sm:size-8! sm:rounded-sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <span className="sr-only">Go to previous page</span>
                        <ChevronLeft />
                    </Button>

                    {mobilePageItems.map((item) =>
                        typeof item === "number" ? (
                            <Button
                                key={item}
                                variant={item === currentPage ? "default" : "outline"}
                                size="icon"
                                className={cn(
                                    "flex size-7! rounded-full sm:hidden",
                                    item === currentPage && "bg-black! text-white! hover:bg-black/90",
                                )}
                                onClick={() => table.setPageIndex(item - 1)}
                            >
                                {item}
                            </Button>
                        ) : (
                            <span
                                key={item}
                                className="flex size-7 items-center justify-center text-sm text-muted-foreground bg-transparent! sm:hidden"
                            >
                                …
                            </span>
                        ),
                    )}

                    {desktopPageItems.map((item) =>
                        typeof item === "number" ? (
                            <Button
                                key={item}
                                variant={item === currentPage ? "default" : "outline"}
                                size="icon"
                                className={cn(
                                    "hidden size-8 rounded-sm sm:flex",
                                    item === currentPage && "bg-red-700! text-white! hover:bg-red-700/90",
                                )}
                                onClick={() => table.setPageIndex(item - 1)}
                            >
                                {item}
                            </Button>
                        ) : (
                            <span
                                key={item}
                                className="hidden size-8 items-center justify-center text-sm text-muted-foreground bg-transparent! sm:flex"
                            >
                                …
                            </span>
                        ),
                    )}
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-7! rounded-full sm:size-8! sm:rounded-sm"
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
