import Navbar from "@/components/navbar";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

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
