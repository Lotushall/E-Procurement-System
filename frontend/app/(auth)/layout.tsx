import { AuthCard } from "./_components/auth-card";

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
    return <AuthCard>{children}</AuthCard>;
}
