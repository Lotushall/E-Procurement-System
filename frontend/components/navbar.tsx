"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOutIcon, Menu, UserIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "./ui/sheet";
import { cn, getInitials } from "@/lib/utils";
import { useUser } from "@/lib/auth/useUser";
import { useLogout } from "@/lib/auth/mutations";
import { routes } from "@/lib/routes";
import { CurrentUser } from "@/lib/auth/types";

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

function AuthControl({
    onNavigate,
    variant = "desktop",
}: {
    onNavigate?: () => void;
    variant?: "desktop" | "mobile";
}) {
    const { data: user, isLoading } = useUser();

    if (isLoading) {
        return variant === "desktop" ? (
            <div className="h-10 w-40 animate-pulse rounded-full bg-gray-300" />
        ) : (
            <div className="h-11 w-full animate-pulse rounded-md bg-gray-300" />
        );
    }

    if (user) {
        return null;
    }

    return (
        <div className="flex flex-col sm:flex-row gap-2">
            <Button
                render={<Link href={routes.auth.login} />}
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
                render={<Link href={routes.auth.register} />}
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

function ProfileMenu() {
    const router = useRouter();
    const { data: user, isLoading } = useUser();
    const logout = useLogout();

    if (isLoading) {
        return <div className="size-8 animate-pulse rounded-full bg-gray-300" />;
    }

    if (!user) {
        return null;
    }

    const initials = getInitials(user.username);

    const profile_name = user.profiles.companyName || user.profiles.shopName || `${user.profiles.firstname} ${user.profiles.lastname}`

    const USER_TYPE_LABEL: Record<CurrentUser["userType"], string> = {
        internal: "พนักงานภายใน",
        company: "นิติบุคคล",
        individual: "ร้านค้า",
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <button
                        aria-label="เมนูผู้ใช้"
                        className="flex items-center justify-center rounded-full p-1 cursor-pointer transition-colors hover:bg-accent"
                    >
                        <Avatar>
                            <AvatarFallback className="bg-red-700 font-semibold text-white">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                    </button>
                }
            />
            <DropdownMenuContent
                align="end"
                className="w-64 overflow-hidden p-0"
            >
                <div className="flex items-center gap-3 bg-linear-to-br from-red-700 to-red-900 px-4 py-3.5">
                    <Avatar
                        size="lg"
                        className="border-2 border-white/30"
                    >
                        <AvatarFallback className="bg-white font-semibold text-red-700">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <p className="truncate tracking-wider text-sm font-semibold text-white capitalize">{profile_name}</p>
                        <p className="truncate tracking-wider text-xs text-red-100"> {USER_TYPE_LABEL[user.userType]}</p>
                    </div>
                </div>
                <div className="p-1">
                    <DropdownMenuItem render={<Link href={user.userType == "internal" ? routes.dashboards.dashboard : routes.profiles.profile} />} className="cursor-pointer">
                        <UserIcon />
                        โปรไฟล์
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                            console.log("[LOGOUT-DEBUG] logout menu item clicked");
                            logout.mutate(undefined, {
                                onSuccess: () => {
                                    console.log("[LOGOUT-DEBUG] call-level onSuccess: pushing to /");
                                    router.push("/");
                                },
                            });
                        }}
                        className="cursor-pointer"
                    >
                        <LogOutIcon />
                        ออกจากระบบ
                    </DropdownMenuItem>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function NotificationButton() {
    return (
        <button
            type="button"
            aria-label="การแจ้งเตือน"
            className="flex items-center justify-center rounded-full p-2 text-muted-foreground cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground"
        >
            <Bell className="size-5" />
        </button>
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
    const { data: user } = useUser();

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

                <div className="flex items-center gap-1">
                    {user && <NotificationButton />}
                    <ProfileMenu />

                    <div className="hidden md:block">
                        <AuthControl variant="desktop" />
                    </div>

                    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                        <SheetTrigger
                            render={
                                <button
                                    type="button"
                                    className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-muted transition-colors"
                                    aria-label="เปิดเมนู"
                                />
                            }
                        >
                            <Menu />
                        </SheetTrigger>

                        <SheetContent side="right" className="md:hidden">
                            <SheetHeader>
                                <SheetTitle>เมนู</SheetTitle>
                            </SheetHeader>

                            <div className="flex flex-1 flex-col gap-4 px-4 pb-4 overflow-y-auto">
                                <div className="flex flex-col gap-3">
                                    <NavLinks onNavigate={() => setMobileOpen(false)} />
                                </div>
                                <AuthControl
                                    variant="mobile"
                                    onNavigate={() => setMobileOpen(false)}
                                />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </div>
    )
}
