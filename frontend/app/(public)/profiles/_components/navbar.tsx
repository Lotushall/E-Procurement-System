import { Badge } from "@/components/ui/badge";
import { routes } from "@/lib/routes";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
    return (
        <div className="flex flex-col gap-3.5">
            <Link href={routes.home} className="flex items-center gap-1.5 text-gray-600">
                <ChevronLeft size={17} />
                <p className="font-semibold">กลับสู่หน้าหลัก</p>
            </Link>

            <div className="flex flex-col">
                <div className="flex justify-between items-center">
                    <h1 className="text-[26px] font-bold">ข้อมูลผู้ค้า</h1>
                    <Badge
                        variant="secondary"
                        className="flex items-center gap-1.75 text-sm text-green-800 tracking-wide font-bold px-3.5 py-3 h-8 bg-green-700/15"
                    >
                        <span className="bg-green-800 w-1.75 h-1.75 rounded-full" />
                        ขึ้นทะเบียนแล้ว
                    </Badge>
                </div>

                <p className="text-sm tracking-wide text-gray-600">จัดการข้อมูลบริษัท ผู้ติดต่อ และเอกสารประกอบสำหรับการขึ้นทะเบียน</p>
            </div>
        </div>
    )
}
