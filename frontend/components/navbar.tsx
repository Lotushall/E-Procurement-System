"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Building2, CheckCircle2, ChevronDown, CircleUserRound, FileText, LogOutIcon, Menu, UserIcon, Users } from "lucide-react";
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
import { useVendorProfileCompleteness } from "@/lib/vendor/useVendorProfileCompleteness";

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
                        className="flex items-center justify-center gap-2 rounded-full p-1 cursor-pointer transition-colors hover:bg-accent md:justify-start md:border md:border-border md:bg-background md:py-1 md:pl-1 md:pr-3 md:hover:bg-accent/60"
                    >
                        <Avatar>
                            <AvatarFallback className="bg-red-700 font-semibold text-white">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <span className="hidden max-w-28 truncate text-sm font-medium capitalize md:inline">
                            {profile_name}
                        </span>
                        <ChevronDown className="hidden size-4 text-muted-foreground md:block" />
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
                        {user.userType === "internal" ? "แดชบอร์ด" : "โปรไฟล์"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                            console.log("[LOGOUT-DEBUG] logout menu item clicked");
                            logout.mutate(undefined, {
                                onSuccess: () => {
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

function NotificationMenu() {
    const { data: user } = useUser();
    const {
        hasVertifyEmail,
        hasIncompleteAddress,
        hasIncompleteContact,
        hasIncompleteDocument,
    } = useVendorProfileCompleteness();

    const isVendor = user?.userType === "company" || user?.userType === "individual";

    const notifications = isVendor
        ? [
            {
                key: "account",
                icon: <CircleUserRound className="size-4" />,
                label: "ยืนยันอีเมลของคุณ",
                description: "ยืนยันเพื่อใช้งานได้เต็มรูปแบบ",
                href: routes.profiles.profile,
                show: hasVertifyEmail,
            },
            {
                key: "vendor-info",
                icon: <Building2 className="size-4" />,
                label: "กรอกข้อมูลกิจการให้ครบถ้วน",
                description: "ที่อยู่ จังหวัด รหัสไปรษณีย์",
                href: routes.profiles.vendorInfo,
                show: hasIncompleteAddress,
            },
            {
                key: "contact",
                icon: <Users className="size-4" />,
                label: "เพิ่มข้อมูลผู้ติดต่อให้ครบถ้วน",
                description: "ชื่อ อีเมล และเบอร์โทรผู้ติดต่อหลัก",
                href: routes.profiles.contract,
                show: hasIncompleteContact,
            },
            {
                key: "document",
                icon: <FileText className="size-4" />,
                label: "แนบเอกสารประกอบให้ครบถ้วน",
                description: "เอกสารที่จำเป็นสำหรับการขึ้นทะเบียน",
                href: routes.profiles.document,
                show: hasIncompleteDocument,
            },
        ].filter((notification) => notification.show)
        : [];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <button
                        type="button"
                        aria-label="การแจ้งเตือน"
                        className="relative flex items-center justify-center rounded-full p-2 text-muted-foreground cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground"
                    />
                }
            >
                <Bell className="size-5" />
                {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-1.75 h-1.75 rounded-full bg-red-600" />
                )}
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-80 overflow-hidden p-0"
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold tracking-wide">การแจ้งเตือน</p>
                    {notifications.length > 0 && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                            {notifications.length} รายการ
                        </span>
                    )}
                </div>

                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                        <CheckCircle2 className="size-8 text-green-600" />
                        <p className="text-sm text-muted-foreground">ไม่มีการแจ้งเตือนใหม่</p>
                    </div>
                ) : (
                    <div className="p-1">
                        {notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.key}
                                render={<Link href={notification.href} />}
                                className="cursor-pointer items-start gap-3 py-2.5"
                            >
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                                    {notification.icon}
                                </span>
                                <div className="flex min-w-0 flex-col">
                                    <p className="text-sm font-medium leading-tight">{notification.label}</p>
                                    <p className="text-xs text-muted-foreground">{notification.description}</p>
                                </div>
                            </DropdownMenuItem>
                        ))}
                    </div>
                )}
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
                    {user && <NotificationMenu />}
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
