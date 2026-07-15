import { AuthCard } from "./_components/auth-card";
import { GuestGuard } from "./_components/guest-guard";

export const metadata = {
    title: {
        default: "Lotushall Mining E-Bidding",
        template: "%s | Lotushall Mining E-Bidding",
    },
    description: "Lotushall Mining Tender Management System",
};

export default function AuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <GuestGuard>
            <AuthCard>{children}</AuthCard>
        </GuestGuard>
    );
}
