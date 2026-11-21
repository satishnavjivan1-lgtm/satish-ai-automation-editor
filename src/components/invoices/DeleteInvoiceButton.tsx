'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';

export function DeleteInvoiceButton({ id, invoiceNo }: { id: number; invoiceNo: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete invoice ${invoiceNo}? This will restore stock.`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete invoice');
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error deleting invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Delete Invoice"
      className="p-1.5 rounded-lg text-gray-400 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin text-red-600" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}
