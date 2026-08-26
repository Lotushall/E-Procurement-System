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
import { usePositionList } from "@/lib/internal-profiles/queries/usePositionList";
import { ListTableSkeleton } from "./list-table-skeleton";
import EditPositionDialog from "./edit-position-dialog";
import DeletePositionDialog from "./delete-position-dialog";
import { Badge } from "@/components/ui/badge";

export default function PositionTab() {
    const [search, setSearch] = useState("");
    const { data: positions, isPending, isError } = usePositionList();

    const trimmedSearch = search.trim();

    const visible = useMemo(() => {
        const list = positions ?? [];
        const query = trimmedSearch.toLowerCase();
        if (!query) return list;
        return list.filter((position) => position.name.toLowerCase().includes(query));
    }, [positions, trimmedSearch]);

    if (isPending) {
        return (
            <div className="flex flex-col gap-4 pt-4">
                <ListTableSkeleton />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 pt-4">
            <SearchInput value={search} onValueChange={setSearch} placeholder="ค้นหาตำแหน่ง" className="" />

            {isError ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                    ไม่สามารถโหลดข้อมูลตำแหน่งได้ กรุณาลองใหม่อีกครั้ง
                </p>
            ) : visible.length > 0 ? (
                <div className="overflow-hidden rounded-xl border shadow-md">
                    <Table>
                        <TableHeader className="bg-[#F7F8FA]">
                            <TableRow>
                                <TableHead className="px-4 py-3 font-bold text-gray-600 tracking-wide">ชื่อตำแหน่ง</TableHead>
                                <TableHead className="px-4 py-3 font-bold text-gray-600 text-center tracking-wide w-40">จำนวนพนักงาน</TableHead>
                                <TableHead className="px-4 py-3 font-bold text-gray-600 tracking-wide w-20 text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map((position) => (
                                <TableRow key={position.id} className="even:bg-[#F7F8FA] odd:bg-white">
                                    <TableCell className="px-4 py-3 text-gray-700 font-bold">{position.name}</TableCell>
                                    <TableCell className="px-4 py-3 text-gray-700">
                                        <div className="flex justify-center items-center">
                                            <Badge variant="outline">
                                                {position.internalProfilesCount ?? 0} คน
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex justify-center gap-1.5">
                                            <EditPositionDialog position={position} />
                                            <DeletePositionDialog position={position} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                    {trimmedSearch ? "ไม่พบตำแหน่งที่ตรงกับคำค้นหา" : "ยังไม่มีตำแหน่งในระบบ"}
                </p>
            )}
        </div>
    );
}
