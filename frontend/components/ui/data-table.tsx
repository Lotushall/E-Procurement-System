"use client"

import { Fragment, type ReactNode } from "react"
import {
    ColumnDef,
    OnChangeFn,
    PaginationState,
    SortingState,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { cn } from "@/lib/utils"

declare module "@tanstack/react-table" {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required to match the augmented interface's signature
    interface ColumnMeta<TData, TValue> {
        // Tailwind width class (e.g. "w-32"), applied to both the header and cells.
        className?: string
    }
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    pageCount: number
    total: number
    pagination: PaginationState
    onPaginationChange: OnChangeFn<PaginationState>
    sorting: SortingState
    onSortingChange: OnChangeFn<SortingState>
    // When given, rows render as these cards below the xl breakpoint instead of the table.
    renderMobileCard?: (row: TData) => ReactNode
}

export function DataTable<TData, TValue>({
    columns,
    data,
    pageCount,
    total,
    pagination,
    onPaginationChange,
    sorting,
    onSortingChange,
    renderMobileCard,
}: DataTableProps<TData, TValue>) {
    const table = useReactTable({
        data,
        columns,
        pageCount,
        state: { pagination, sorting },
        onPaginationChange,
        onSortingChange,
        manualPagination: true,
        manualSorting: true,
        enableMultiSort: false,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <div className="flex flex-col gap-4">
            {renderMobileCard && (
                <div className="grid gap-3 sm:grid-cols-2 xl:hidden">
                    {table.getRowModel().rows.map((row) => (
                        <Fragment key={row.id}>{renderMobileCard(row.original)}</Fragment>
                    ))}
                </div>
            )}
            <div className={cn("overflow-hidden rounded-xl border shadow-md", renderMobileCard && "hidden xl:block")}>
                <Table className="">
                    <TableHeader className="bg-[#F7F8FA]">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead
                                            key={header.id}
                                            className={cn(
                                                "px-4 py-3 font-bold text-gray-600 tracking-wide",
                                                header.column.columnDef.meta?.className,
                                            )}
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="even:bg-[#F7F8FA] odd:bg-white"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            className={cn(
                                                "px-4 py-3 text-gray-700",
                                                cell.column.columnDef.meta?.className,
                                            )}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <DataTablePagination table={table} total={total} />
        </div>
    )
}
