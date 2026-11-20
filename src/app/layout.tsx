import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppLayout } from '@/components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'Kundan Enterprise - ERP System',
  description: 'Billing & Inventory ERP for Kundan Enterprise, Jamnagar',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kundan ERP',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1e3a5f',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="gu">
      <body
        className="bg-gray-50 text-gray-900 min-h-screen antialiased"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
