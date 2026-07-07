"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOutIcon, Menu, UserIcon, X } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth/store";
import { useLogout } from "@/lib/auth/mutations";
import { routes } from "@/lib/routes";

const menus = [
    {
        label: "หน้าหลัก",
        href: routes.home,
    },
    {
        label: "ประกาศจัดซื้อจัดจ้าง",
        href: "",
    },
    {
        label: "ติดต่อเรา",
        href: "",
    },
];

function getInitials(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

function AuthControl({ onNavigate }: { onNavigate?: () => void }) {
    const router = useRouter();
    const { user, isAuthenticated } = useAuthStore();
    const logout = useLogout();

    // if (isLoading) {
    //     return <div className="h-10 w-28 animate-pulse rounded-md bg-muted" />;
    // }

    if (!isAuthenticated || !user) {
        return (
            <div className="flex flex-col sm:flex-row gap-2">
                <Button
                    render={<Link href={routes.login} />}
                    nativeButton={false}
                    onClick={onNavigate}
                    size={"lg"}
                    className={cn(
                        "bg-transparent text-black px-6 cursor-pointer h-10 rounded-md w-full sm:w-auto",
                        "hover:bg-transparent",
                    )}
                >
                    เข้าสู่ระบบ
                </Button>

                <Button
                    render={<Link href={routes.register} />}
                    nativeButton={false}
                    onClick={onNavigate}
                    size={"lg"}
                    className={cn(
                        "bg-red-700 px-6 cursor-pointer h-10 rounded-md w-full sm:w-auto",
                        "hover:bg-transparent hover:text-black hover:border hover:border-red-700 transition-colors duration-100",
                    )}
                >
                    สมัครสมาชิก
                </Button>
            </div>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <button className="flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer hover:bg-muted transition-colors">
                        <Avatar>
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{user.name}</span>
                    </button>
                }
            />
            <DropdownMenuContent align="end">
                <DropdownMenuItem render={<Link href="" onClick={onNavigate} />}>
                    <UserIcon />
                    โปรไฟล์
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                        onNavigate?.();
                        logout.mutate(undefined, {
                            onSuccess: () => router.push("/"),
                        });
                    }}
                >
                    <LogOutIcon />
                    ออกจากระบบ
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname();

    return (
        <>
            {menus.map((menu, index) => {
                const isActive = pathname === menu.href;
                return (
                    <div
                        key={index}
                        className="leading-0 group"
                    >
                        <Link
                            href={menu.href}
                            onClick={onNavigate}
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-primary",
                                isActive && "text-primary",
                            )}
                        >
                            {menu.label}
                        </Link>
                        <div
                            className={cn(
                                "h-0.5 bg-red-700 rounded-full transition-all duration-200",
                                isActive ? "w-full" : "w-0 group-hover:w-full",
                            )}
                        />
                    </div>
                );
            })}
        </>
    );
}

export default function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="border-b-4 border-red-700">
            <div className="flex items-center justify-between px-5 h-16">
                <div className="flex items-center gap-2.5">
                    <Link href={routes.home}>
                        <Image
                            src="/images/icon/lotushall_logo.png"
                            alt="Lotushall Logo"
                            width={50}
                            height={50}
                            priority
                        />
                    </Link>

                    <div className="flex flex-col leading-4.5">
                        <h1 className="font-bold text-sm sm:text-base">Lotushall Mining</h1>
                        <p className="text-xs font-medium text-muted-foreground">e-Bidding System</p>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-4">
                    <NavLinks />
                </div>

                <div className="hidden md:block">
                    <AuthControl />
                </div>

                <button
                    type="button"
                    className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-muted transition-colors"
                    aria-label={mobileOpen ? "ปิดเมนู" : "เปิดเมนู"}
                    aria-expanded={mobileOpen}
                    onClick={() => setMobileOpen((open) => !open)}
                >
                    {mobileOpen ? <X /> : <Menu />}
                </button>
            </div>

            {mobileOpen && (
                <div className="md:hidden flex flex-col gap-4 border-t border-border px-5 py-4">
                    <div className="flex flex-col gap-3">
                        <NavLinks onNavigate={() => setMobileOpen(false)} />
                    </div>
                    <AuthControl onNavigate={() => setMobileOpen(false)} />
                </div>
            )}
        </div>
    )
}
