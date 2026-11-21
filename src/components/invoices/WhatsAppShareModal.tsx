'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Copy, Check, Printer, Share2, Loader2, Phone } from 'lucide-react';

export interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: number;
  invoiceNo: string;
  partyName: string;
  partyPhone?: string;
  totalAmt: number;
  invoiceDate?: string;
  companyName?: string;
}

export function WhatsAppShareModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceNo,
  partyName,
  partyPhone = '',
  totalAmt,
  invoiceDate,
  companyName = 'Kundan Enterprise',
}: WhatsAppShareModalProps) {
  const [phone, setPhone] = useState('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (partyPhone) {
      setPhone(partyPhone.replace(/\D/g, ''));
    } else {
      setPhone('');
    }
  }, [partyPhone, isOpen]);

  if (!isOpen) return null;

  // Build full public URL for PDF invoice view
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pdfViewUrl = `${origin}/invoices/${invoiceId}?print=1`;

  // Formatted bill message for WhatsApp
  const formattedDate = invoiceDate
    ? new Date(invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const messageText = `🧾 *TAX INVOICE - ${companyName.toUpperCase()}*
----------------------------------------
*Invoice No:* ${invoiceNo}
*Date:* ${formattedDate}
*Customer:* ${partyName}
*Total Amount:* ₹ ${Number(totalAmt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
----------------------------------------
📄 *Official PDF Invoice Link:*
${pdfViewUrl}
----------------------------------------
Thank you for your business! 🙏`;

  const handleSendWhatsApp = () => {
    setSending(true);
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const encoded = encodeURIComponent(messageText);

    const waUrl = phoneWithCode
      ? `https://wa.me/${phoneWithCode}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    setTimeout(() => {
      window.open(waUrl, '_blank');
      setSending(false);
      onClose();
    }, 700);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoiceNo} - ${companyName}`,
          text: messageText,
          url: pdfViewUrl,
        });
        onClose();
      } catch {}
    } else {
      handleSendWhatsApp();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Share Bill on WhatsApp</h3>
              <p className="text-xs text-green-100 font-mono">{invoiceNo} • ₹{Number(totalAmt).toLocaleString('en-IN')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Customer & Phone */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              WhatsApp Mobile Number
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-xs font-semibold text-gray-500 font-mono">
                +91
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter 10-digit mobile number"
                className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <Phone className="absolute right-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Party: <span className="font-medium text-gray-700">{partyName}</span>
            </p>
          </div>

          {/* Message Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Bill &amp; PDF Message Preview
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] text-green-700 hover:text-green-800 font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-700 font-mono whitespace-pre-line leading-relaxed max-h-44 overflow-y-auto select-all">
              {messageText}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={handleSendWhatsApp}
            disabled={sending}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>WhatsApp ઓપન થઈ રહ્યું છે...</span>
              </>
            ) : (
              <>
                <MessageCircle className="w-4 h-4" />
                <span>Send via WhatsApp</span>
              </>
            )}
          </button>

          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs sm:text-sm font-medium rounded-xl transition-colors border border-blue-200"
              title="Share via other mobile apps"
            >
              <Share2 className="w-4 h-4" />
              <span>Share App</span>
            </button>
          )}

          <a
            href={pdfViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs sm:text-sm font-medium rounded-xl transition-colors"
            title="Preview or Download PDF"
          >
            <Printer className="w-4 h-4" />
            <span>PDF Bill</span>
          </a>
        </div>
      </div>
    </div>
  );
}
