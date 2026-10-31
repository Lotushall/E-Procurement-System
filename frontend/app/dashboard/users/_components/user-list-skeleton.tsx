import { Skeleton } from "@/components/ui/skeleton";
import { DataTableCardsSkeleton } from "@/components/ui/data-table-cards-skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SKELETON_ROWS = 6;
const COLUMN_WIDTHS = ["w-20", "w-28", "w-16", "w-16", "w-16"];

// การ์ด 1 คอลัมน์ถึง md, 2 คอลัมน์ช่วง lg–xl (xl ขึ้นไปเป็นตาราง) — ใช้ทั้ง DataTable และ skeleton
export const CARD_GRID_CLASS = "sm:grid-cols-1 lg:grid-cols-2";

export function UserTableSkeleton() {
  return (
    <>
      <DataTableCardsSkeleton className={CARD_GRID_CLASS} />
      <UserTableSkeletonDesktop />
    </>
  );
}

function UserTableSkeletonDesktop() {
  return (
    <div className="hidden overflow-hidden rounded-xl border shadow-md xl:block">
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
                <Skeleton className="h-4 w-28" />
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

export function UserListSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <UserTableSkeleton />
    </div>
  );
}
