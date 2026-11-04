import type { Metadata } from "next";
import { Google_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";

const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ['latin', 'thai'],
});

export const metadata: Metadata = {
  title: "LotusHall Mining Heavy Engineering Construction Co., Ltd.",
  description: "ระบบจัดซื้อจัดจ้างอิเล็กทรอนิกส์ (E-Procurement)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${googleSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
          <Toaster position='top-center' richColors />
        </Providers>
      </body>
    </html>
  );
}
