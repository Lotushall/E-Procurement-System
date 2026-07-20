"use client";

import { useRequireAuth } from "@/lib/auth/useRequireAuth";
import { Skeleton } from "@/components/ui/skeleton";

function ProfileLayoutSkeleton() {
    return (
        <div className="max-w-290 mx-4 md:mx-8 lg:mx-14 xl:mx-auto px-6.2 pt-5.5 pb-25">
            <div className="flex flex-col gap-3.5">
                <Skeleton className="h-5 w-32" />

                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-8 w-25 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-72 max-w-full" />
                </div>
            </div>

            <main className="flex flex-col lg:flex-row gap-5 mt-5">
                <div className="flex flex-row flex-wrap md:flex-nowrap lg:flex-col gap-0.5 bg-white border border-gray-200 shadow rounded-md p-2 lg:max-w-58 w-full lg:w-full h-fit">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="flex items-center gap-2.5 px-3.5 py-2.5">
                            <Skeleton className="w-4.5 h-4.5 rounded-full shrink-0" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-4 bg-white border border-gray-200 shadow rounded-md p-6 w-full">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            </main>
        </div>
    );
}

export function AuthGuard({ children }: Readonly<{ children: React.ReactNode }>) {
    const { isChecking } = useRequireAuth();

    if (isChecking) {
        return <ProfileLayoutSkeleton />;
    }

    return <>{children}</>;
}
