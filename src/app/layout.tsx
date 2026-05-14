import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rotakin v3 — CCTV Audit Platform",
  description: "SANS 10222-5-1-4 CCTV compliance audit and reporting",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <TooltipProvider>
          {children}
          <Toaster theme="dark" position="bottom-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
