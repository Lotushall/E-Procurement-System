"use client";

import { Card } from "@/components/ui/card";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export function AuthCard({ children }: Readonly<{ children: React.ReactNode }>) {
    const pathname = usePathname();
    const isRegister = pathname === routes.register;

    return (
        <div className="flex justify-center items-start sm:items-center bg-background min-h-dvh p-8">
            <Card
                className={cn(
                    "w-full py-6 px-5 transition-[max-width] duration-150",
                    isRegister ? "max-w-160 gap-0 px-9 scale-90" : "max-w-103"
                )}
            >
                {children}
            </Card>
        </div>
    );
}
