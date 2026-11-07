import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

// กรอบการ์ดของแต่ละขั้นในฟอร์มสร้าง TOR: เลขวงกลม + หัวข้อ (+ คำอธิบายสั้นต่อท้าย)
export function FormSection({
    step,
    title,
    required,
    description,
    children,
}: {
    step: number;
    title: string;
    required?: boolean;
    description?: string;
    children: ReactNode;
}) {
    return (
        <Card className="py-6 shadow-sm">
            <CardContent className="flex flex-col gap-5 px-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                        {step}
                    </span>
                    <h2 className="text-lg font-semibold text-gray-900">
                        {title}
                        {required && <span className="text-red-600"> *</span>}
                    </h2>
                    {description && <p className="text-xs text-gray-500">{description}</p>}
                </div>
                {children}
            </CardContent>
        </Card>
    );
}
