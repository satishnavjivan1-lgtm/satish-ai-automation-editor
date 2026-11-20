import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'Navjivan ERP System',
  description: 'Billing & Inventory ERP for Navjivan, Jamnagar',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className="bg-gray-50 text-gray-900"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        <div className="no-print">
          <Sidebar />
        </div>
        {/* Offset for fixed sidebar (zero on print) */}
        <div className="ml-64 print:ml-0 print:p-0 flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
