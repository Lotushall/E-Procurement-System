"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { RequireRole } from "@/lib/auth/guards/RequireRole";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useState } from "react";
import DepartmentTab from "./_components/department-tab";
import PositionTab from "./_components/position-tab";
import DepartmentFormDialog from "./_components/department-form-dialog";
import PositionFormDialog from "./_components/position-form-dialog";

type ActiveTab = "department" | "position";

export default function DepartmentsPositions() {
    useBreadcrumb([
        { label: "พนักงานภายใน", href: routes.dashboards.internal_employees.index() },
        { label: "จัดการแผนก และตำแหน่ง" },
    ]);

    const [activeTab, setActiveTab] = useState<ActiveTab>("department");

    return (
        <RequireRole role="admin">
            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                    <div className="">
                        <h1 className="text-2xl font-bold">จัดการแผนก และตำแหน่ง</h1>
                        <p className="text-sm text-gray-600 tracking-wide">
                            จัดการข้อมูลแผนกและตำแหน่งงานทั้งหมดที่ใช้ในระบบพนักงานภายใน
                        </p>
                    </div>

                    {activeTab === "department" ? <DepartmentFormDialog /> : <PositionFormDialog />}
                </div>

                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)}>
                    <TabsList className={cn(
                        "w-full lg:w-85 min-h-12 border p-1 rounded-md space-x-1",
                        "*:data-active:bg-red-700 *:data-active:text-white *:data-active:hover:text-white",
                        "*:font-bold tracking-wide *:cursor-pointer *:rounded-md"
                    )}>
                        <TabsTrigger value="department">แผนก</TabsTrigger>
                        <TabsTrigger value="position">ตำแหน่ง</TabsTrigger>
                    </TabsList>

                    <TabsContent value="department">
                        <DepartmentTab />
                    </TabsContent>
                    <TabsContent value="position">
                        <PositionTab />
                    </TabsContent>
                </Tabs>
            </div>
        </RequireRole>
    )
}
