import { Card, CardContent } from "@/components/ui/card";

export function NextStepsCard() {
    return (
        <Card className="py-5 shadow-sm">
            <CardContent className="flex flex-col gap-3 px-5">
                <p className="text-sm font-semibold text-gray-900">ขั้นตอนต่อจากนี้</p>
                <ol className="flex list-decimal flex-col gap-2 pl-4 text-xs text-gray-700 marker:text-gray-500">
                    <li>
                        <span className="font-semibold text-gray-900">ส่งพิจารณา</span> ให้ผู้มีอำนาจภายในหน่วยงาน
                    </li>
                    <li>
                        ผู้พิจารณา <span className="font-semibold text-gray-900">อนุมัติ</span> หรือส่งกลับให้แก้ไขพร้อมเหตุผล
                    </li>
                    <li>
                        หลังอนุมัติจึง <span className="font-semibold text-gray-900">ประกาศ</span> และเปิดรับซอง
                    </li>
                </ol>
            </CardContent>
        </Card>
    );
}
