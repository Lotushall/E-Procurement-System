import { AuthCard } from "@/app/(auth)/_components/auth-card";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: {
        default: "Lotushall Mining E-Bidding",
        template: "%s | Lotushall Mining E-Bidding",
    },
    description: "Lotushall Mining Tender Management System",
};

export default function VerifyLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <AuthCard>{children}</AuthCard>;
}
