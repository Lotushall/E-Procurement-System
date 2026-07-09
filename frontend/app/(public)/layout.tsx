import Navbar from "@/components/navbar";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: {
        default: "Lotushall Mining E-Bidding",
        template: "%s | Lotushall Mining E-Bidding",
    },
    description: "Lotushall Mining Tender Management System",
};

export default function PublicLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <Navbar />
            <main>{children}</main>
            <ScrollToTop />
        </>
    );
}
