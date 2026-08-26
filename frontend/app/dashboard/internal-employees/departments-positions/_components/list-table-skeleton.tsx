import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const SKELETON_ROWS = 6;

export function ListTableSkeleton() {
    return (
        <div className="overflow-hidden rounded-xl border shadow-md">
            <Table>
                <TableHeader className="bg-[#F7F8FA]">
                    <TableRow>
                        <TableHead className="px-4 py-3">
                            <Skeleton className="h-4 w-32" />
                        </TableHead>
                        <TableHead className="px-4 py-3">
                            <Skeleton className="h-4 w-24" />
                        </TableHead>
                        <TableHead className="px-4 py-3">
                            <Skeleton className="h-4 w-16" />
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: SKELETON_ROWS }).map((_, rowIndex) => (
                        <TableRow key={rowIndex} className="even:bg-[#F7F8FA] odd:bg-white">
                            <TableCell className="px-4 py-3">
                                <Skeleton className="h-4 w-32" />
                            </TableCell>
                            <TableCell className="px-4 py-3">
                                <Skeleton className="h-4 w-20" />
                            </TableCell>
                            <TableCell className="px-4 py-3">
                                <div className="flex justify-center gap-1.5">
                                    <Skeleton className="size-8 rounded-md" />
                                    <Skeleton className="size-8 rounded-md" />
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
