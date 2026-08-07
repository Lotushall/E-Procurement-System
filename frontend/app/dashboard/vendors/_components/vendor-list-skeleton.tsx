import { Card, CardContent } from "@/components/ui/card";
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
const COLUMN_WIDTHS = ["w-20", "w-24", "w-28", "w-20", "w-16", "w-16", "w-16"];

export function VendorTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border shadow-md">
      <Table>
        <TableHeader className="bg-[#F7F8FA]">
          <TableRow>
            <TableHead className="px-4 py-3">
              <Skeleton className="h-4 w-24" />
            </TableHead>
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
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8.5 shrink-0 rounded-md" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </TableCell>
              <TableCell className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell className="px-4 py-3">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell className="px-4 py-3">
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell className="px-4 py-3">
                <Skeleton className="mx-auto h-4 w-20" />
              </TableCell>
              <TableCell className="px-4 py-3">
                <Skeleton className="mx-auto h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell className="px-4 py-3">
                <Skeleton className="mx-auto h-4 w-16" />
              </TableCell>
              <TableCell className="px-4 py-3">
                <Skeleton className="mx-auto size-8 rounded-md" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function VendorListSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border-0 shadow-md ring-0">
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-7 w-10" />
            </CardContent>
          </Card>
        ))}
      </div>

      <VendorTableSkeleton />
    </div>
  );
}
