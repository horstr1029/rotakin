import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rotakin v3 — CCTV Audit Platform",
  description: "SANS 10222-5-1-4 CCTV compliance audit and reporting",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Rotakin" },
};

export const viewport: Viewport = {
  themeColor: "#00c2ff",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProviderWrapper session={session}>
          <TooltipProvider>
            {children}
            <Toaster theme="system" position="bottom-right" />
          </TooltipProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
