import { Metadata } from "next";
import Navbar from "./_components/navbar";
import Sidebar from "./_components/sidebar";
import { AuthGuard } from "./_components/auth-guard";

export const metadata: Metadata = {
    title: {
        default: "Lotushall Mining E-Bidding",
        template: "%s | Lotushall Mining E-Bidding",
    },
    description: "Lotushall Mining Tender Management System",
};

export default function ProfileLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <AuthGuard>
            <div className="max-w-290 mx-auto px-6.2 pt-5.5 pb-25">
                <Navbar />
                <main className="flex gap-5 mt-5">
                    <Sidebar />

                    <div className="bg-white border border-gray-200 shadow rounded-md p-6 w-full">
                        {children}
                    </div>
                </main>
            </div>
        </AuthGuard>
    );
}
