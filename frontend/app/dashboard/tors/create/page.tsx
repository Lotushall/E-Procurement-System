"use client";

import { useRouter } from "next/navigation";
import { InfoIcon } from "lucide-react";
import { FormProvider } from "react-hook-form";
import { RequirePermission } from "@/lib/auth/guards/RequirePermission";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { routes } from "@/lib/routes";
import { GeneralSection } from "./_components/general-section";
import { BudgetSection } from "./_components/budget-section";
import { BiddingPeriodSection } from "./_components/bidding-period-section";
import { ScopeSection } from "./_components/scope-section";
import { TorActionCard } from "./_components/tor-action-card";
import { NextStepsCard } from "./_components/next-steps-card";
import { useCreateTorForm } from "./_hooks/use-create-tor-form";

function CreateTORContent() {
    const router = useRouter();
    const { form, onSubmit, isSubmitting } = useCreateTorForm((tor) => router.push(routes.dashboards.tors.detail(tor.id)));

    useBreadcrumb([
        { label: "การจัดการ TOR", href: routes.dashboards.tors.index },
        { label: "สร้าง TOR" },
    ]);

    return (
        <div className="flex flex-col gap-5">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">สร้าง TOR ใหม่</h1>
                <p className="mt-1 text-sm text-gray-600">
                    TOR จะถูกบันทึกเป็นฉบับร่าง — เลข TOR ออกให้อัตโนมัติเมื่อบันทึก
                </p>
            </div>

            <FormProvider {...form}>
                <form onSubmit={onSubmit} noValidate className="flex gap-4.5 max-lg:flex-col">
                    <div className="flex min-w-0 flex-2 flex-col gap-4">
                        <GeneralSection />
                        <BudgetSection />
                        <BiddingPeriodSection />
                        <ScopeSection />
                    </div>

                    {/* จอเล็ก: aside ต่อท้ายฟอร์ม เหลือแค่การ์ดการดำเนินการ */}
                    <aside className="flex flex-1 flex-col gap-4 lg:sticky lg:top-19.5 lg:max-w-xs lg:self-start">
                        <TorActionCard isSubmitting={isSubmitting} />

                        <div className="max-lg:hidden">
                            <NextStepsCard />
                        </div>

                        <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 max-lg:hidden">
                            <InfoIcon className="size-4 shrink-0" />
                            <p>ส่งพิจารณาแล้วจะแก้ไขไม่ได้ จนกว่าผู้พิจารณาจะส่งกลับให้แก้ไข</p>
                        </div>
                    </aside>
                </form>
            </FormProvider>
        </div>
    );
}

export default function CreateTORPage() {
    return (
        <RequirePermission permissions={["tors.create"]}>
            <CreateTORContent />
        </RequirePermission>
    );
}
