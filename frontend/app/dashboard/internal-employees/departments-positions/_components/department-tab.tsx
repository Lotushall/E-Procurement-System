"use client";

import { useMemo, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { SearchInput } from "@/components/search-input";
import { useDepartmentList } from "@/lib/internal-profiles/queries/useDepartmentList";
import { ListTableSkeleton } from "./list-table-skeleton";
import EditDepartmentDialog from "./edit-department-dialog";
import DeleteDepartmentDialog from "./delete-department-dialog";
import { Badge } from "@/components/ui/badge";

export default function DepartmentTab() {
    const [search, setSearch] = useState("");
    const { data: departments, isPending, isError } = useDepartmentList();

    const trimmedSearch = search.trim();

    const visible = useMemo(() => {
        const list = departments ?? [];
        const query = trimmedSearch.toLowerCase();
        if (!query) return list;
        return list.filter((department) => department.name.toLowerCase().includes(query));
    }, [departments, trimmedSearch]);

    if (isPending) {
        return (
            <div className="flex flex-col gap-4 pt-4">
                <ListTableSkeleton />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 pt-4">
            <SearchInput value={search} onValueChange={setSearch} placeholder="ค้นหาแผนก" className="" />

            {isError ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                    ไม่สามารถโหลดข้อมูลแผนกได้ กรุณาลองใหม่อีกครั้ง
                </p>
            ) : visible.length > 0 ? (
                <div className="overflow-hidden rounded-xl border shadow-md">
                    <Table>
                        <TableHeader className="bg-[#F7F8FA]">
                            <TableRow>
                                <TableHead className="px-4 py-3 font-bold text-gray-600 tracking-wide">ชื่อแผนก</TableHead>
                                <TableHead className="px-4 py-3 font-bold text-gray-600 text-center tracking-wide w-40">จำนวนพนักงาน</TableHead>
                                <TableHead className="px-4 py-3 font-bold text-gray-600 tracking-wide w-20 text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map((department) => (
                                <TableRow key={department.id} className="even:bg-[#F7F8FA] odd:bg-white">
                                    <TableCell className="px-4 py-3 text-gray-700 font-bold">{department.name}</TableCell>
                                    <TableCell className="px-4 py-3 text-gray-700">
                                        <div className="flex justify-center items-center">
                                            <Badge variant="outline" >
                                                {department.internalProfilesCount ?? 0} คน
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex justify-center gap-1.5">
                                            <EditDepartmentDialog department={department} />
                                            <DeleteDepartmentDialog department={department} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                    {trimmedSearch ? "ไม่พบแผนกที่ตรงกับคำค้นหา" : "ยังไม่มีแผนกในระบบ"}
                </p>
            )}
        </div>
    );
}
