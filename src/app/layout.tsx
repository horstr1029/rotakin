import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rotakin v3 — CCTV Audit Platform',
  description: 'SANS 10222-5-1-4 CCTV compliance audit management platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <body style={{ height: '100%', margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
