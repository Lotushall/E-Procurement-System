import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { TenderProjectStatsCards } from "./tender-project-stats-cards";

const SKELETON_ROWS = 6;
const COLUMN_WIDTHS = ["w-20", "w-40", "w-24", "w-28", "w-32", "w-10", "w-16", "w-16"];

const EMPTY_STATS = {
    totalCount: 0,
    totalBudget: 0,
    inProgressCount: 0,
    completedCount: 0,
};

export function TenderProjectTableSkeleton() {
    return (
        <div className="overflow-hidden rounded-xl border shadow-md">
            <Table>
                <TableHeader className="bg-[#F7F8FA]">
                    <TableRow>
                        {COLUMN_WIDTHS.map((width, index) => (
                            <TableHead key={index} className="px-4 py-3">
                                <Skeleton className={`h-4 ${width}`} />
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: SKELETON_ROWS }).map((_, rowIndex) => (
                        <TableRow key={rowIndex} className="even:bg-[#F7F8FA] odd:bg-white">
                            <TableCell className="px-4 py-3">
                                <Skeleton className="h-4 w-16" />
                            </TableCell>
                            <TableCell className="px-4 py-3">
                                <div className="flex flex-col gap-1.5">
                                    <Skeleton className="h-4 w-36" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                                <Skeleton className="h-4 w-20" />
                            </TableCell>
                            <TableCell className="px-4 py-3">
                                <div className="flex flex-col items-end gap-1.5">
                                    <Skeleton className="h-3.5 w-24" />
                                    <Skeleton className="h-4 w-20" />
                                </div>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                                <Skeleton className="h-4 w-32" />
                            </TableCell>
                            <TableCell className="px-4 py-3">
                                <Skeleton className="mx-auto h-4 w-6" />
                            </TableCell>
                            <TableCell className="px-4 py-3">
                                <Skeleton className="mx-auto h-5 w-16 rounded-full" />
                            </TableCell>
                            <TableCell className="px-4 py-3">
                                <Skeleton className="h-4 w-16" />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export function TenderProjectListSkeleton() {
    return (
        <div className="flex flex-col gap-5">
            <TenderProjectStatsCards stats={EMPTY_STATS} isPending />
            <TenderProjectTableSkeleton />
        </div>
    );
}
