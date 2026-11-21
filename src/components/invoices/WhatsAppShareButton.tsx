'use client';

import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { WhatsAppShareModal } from './WhatsAppShareModal';

interface WhatsAppShareButtonProps {
  invoiceId: number;
  invoiceNo: string;
  partyName: string;
  partyPhone?: string;
  totalAmt: number;
  invoiceDate?: string;
  companyName?: string;
  variant?: 'button' | 'icon';
  className?: string;
}

export function WhatsAppShareButton({
  invoiceId,
  invoiceNo,
  partyName,
  partyPhone,
  totalAmt,
  invoiceDate,
  companyName,
  variant = 'button',
  className = '',
}: WhatsAppShareButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {variant === 'button' ? (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-medium rounded-lg shadow-sm transition-all active:scale-95 ${className}`}
          title="Share Bill & PDF on WhatsApp"
        >
          <MessageCircle className="h-4 w-4" />
          <span>WhatsApp</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={`p-1.5 rounded-lg text-emerald-600 hover:text-white hover:bg-emerald-600 bg-emerald-50 transition-all ${className}`}
          title="Share Bill on WhatsApp"
        >
          <MessageCircle className="h-4 w-4" />
        </button>
      )}

      <WhatsAppShareModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        invoiceId={invoiceId}
        invoiceNo={invoiceNo}
        partyName={partyName}
        partyPhone={partyPhone}
        totalAmt={totalAmt}
        invoiceDate={invoiceDate}
        companyName={companyName}
      />
    </>
  );
}
