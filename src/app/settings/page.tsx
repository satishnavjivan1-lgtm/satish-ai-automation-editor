'use client'

import React, { useState, useEffect } from 'react'
import {
  Building2,
  MapPin,
  Landmark,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Phone,
  Mail,
  CreditCard,
  QrCode,
  ShieldCheck,
  Image as ImageIcon,
  Upload,
  Trash2,
} from 'lucide-react'

interface CompanyData {
  id?: number
  name: string
  logoUrl?: string
  address: string
  city: string
  state: string
  stateCode: string
  gstin: string
  pan: string
  phone: string
  email: string
  bankName: string
  branch: string
  accountNo: string
  ifscCode: string
  upiId: string
  invoicePrefix: string
  termsAndConditions: string
}

const DEFAULT_COMPANY: CompanyData = {
  name: 'Navjivan ERP System',
  logoUrl: '',
  address: 'Plot No. 12, GIDC Industrial Estate, Shantiniketan',
  city: 'Jamnagar',
  state: 'Gujarat',
  stateCode: '24',
  gstin: '24AABCN1234N1Z5',
  pan: 'AABCN1234N',
  phone: '9825000001',
  email: 'info@navjivanerp.com',
  bankName: 'State Bank of India',
  branch: 'GIDC Jamnagar Branch',
  accountNo: '31234567890',
  ifscCode: 'SBIN0001234',
  upiId: 'navjivan@sbi',
  invoicePrefix: 'NVJ',
  termsAndConditions:
    '(1) Subject to Jamnagar Jurisdiction.\n(2) Goods once sold will not be taken back.\n(3) Interest @ 18% p.a. will be charged on all bills remaining pending after due date.\n(4) Our risk & responsibility ceases once goods are dispatched.',
}

export default function SettingsPage() {
  const [form, setForm] = useState<CompanyData>({ ...DEFAULT_COMPANY })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'BANK' | 'INVOICE' | 'PREVIEW'>('PROFILE')

  useEffect(() => {
    fetchCompany()
  }, [])

  const fetchCompany = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/company')
      if (res.ok) {
        const data = await res.json()
        setForm({
          name: data.name || '',
          logoUrl: data.logoUrl || '',
          address: data.address || '',
          city: data.city || 'Jamnagar',
          state: data.state || 'Gujarat',
          stateCode: data.stateCode || '24',
          gstin: data.gstin || '',
          pan: data.pan || '',
          phone: data.phone || '',
          email: data.email || '',
          bankName: data.bankName || '',
          branch: data.branch || '',
          accountNo: data.accountNo || '',
          ifscCode: data.ifscCode || '',
          upiId: data.upiId || '',
          invoicePrefix: data.invoicePrefix || 'NVJ',
          termsAndConditions: data.termsAndConditions || DEFAULT_COMPANY.termsAndConditions,
        })
      }
    } catch {
      setErrorMsg('Failed to fetch existing company details.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file size must be less than 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setForm(prev => ({ ...prev, logoUrl: dataUrl }))
      setSuccessMsg('Logo uploaded successfully! Click "Save Settings" to save.')
    }
    reader.readAsDataURL(file)
  }

  const handleGstinChange = (value: string) => {
    const upper = value.toUpperCase()
    const updates: Partial<CompanyData> = { gstin: upper }
    if (upper.length >= 2) {
      const code = upper.substring(0, 2)
      if (/^\d{2}$/.test(code)) {
        updates.stateCode = code
        if (code === '24') updates.state = 'Gujarat'
        else if (code === '27') updates.state = 'Maharashtra'
        else if (code === '08') updates.state = 'Rajasthan'
      }
    }
    if (upper.length >= 12) {
      updates.pan = upper.substring(2, 12)
    }
    setForm(prev => ({ ...prev, ...updates }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccessMsg('')
    setErrorMsg('')

    if (!form.name.trim() || !form.gstin.trim() || !form.address.trim()) {
      setErrorMsg('Company Name, GSTIN, and Address are required.')
      setSaving(false)
      return
    }

    try {
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update company profile')
      }
      setSuccessMsg('Company settings saved successfully! Changes are updated across all invoices and prints.')
      setTimeout(() => setSuccessMsg(''), 6000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving company settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Company Settings &amp; Profile</h1>
              <p className="text-sm text-gray-500">કંપની પ્રોફાઇલ, જીએસટી, બેંક વિગતો અને ઇનવોઇસ સેટિંગ્સ</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || loading}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-700 text-white font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-sm"
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Settings
            </>
          )}
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm font-medium">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('PROFILE')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'PROFILE'
              ? 'bg-blue-700 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
        >
          <Building2 className="h-4 w-4" />
          Company &amp; Address
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BANK')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'BANK'
              ? 'bg-blue-700 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
        >
          <Landmark className="h-4 w-4" />
          Banking &amp; UPI
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('INVOICE')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'INVOICE'
              ? 'bg-blue-700 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
        >
          <FileText className="h-4 w-4" />
          Invoice &amp; Terms
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PREVIEW')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'PREVIEW'
              ? 'bg-blue-700 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
        >
          <Eye className="h-4 w-4" />
          Live Bill Preview
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
          <p>Loading company profile...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* TAB 1: PROFILE & ADDRESS */}
          {activeTab === 'PROFILE' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo Upload Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-sm md:col-span-2">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-blue-700" />
                    <div>
                      <h2 className="font-semibold text-gray-900">Company Logo (કંપનીનો લોગો)</h2>
                      <p className="text-xs text-gray-500">Upload your firm's logo to display on invoices, print-outs, and sidebar.</p>
                    </div>
                  </div>
                  {form.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, logoUrl: '' })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors font-medium"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove Logo
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Logo Preview */}
                  <div className="w-32 h-28 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center p-2 shrink-0 relative overflow-hidden group">
                    {form.logoUrl ? (
                      <img src={form.logoUrl} alt="Company Logo" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center text-gray-400">
                        <ImageIcon className="h-8 w-8 mx-auto mb-1 opacity-40" />
                        <span className="text-[11px] font-medium">No Logo Uploaded</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="space-y-2 flex-1">
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 cursor-pointer transition-colors shadow-sm">
                      <Upload className="h-4 w-4" />
                      {form.logoUrl ? 'Change Logo Image' : 'Upload Company Logo'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                    </label>
                    <p className="text-xs text-gray-500">
                      Supported formats: <strong>PNG, JPG, SVG, WebP</strong>. Recommended size: 200x200 px.
                    </p>
                    <p className="text-xs text-green-700 font-medium">
                      ✓ Automatically scaled &amp; displayed on all Tax Invoices (top-left header) and Sidebar.
                    </p>
                  </div>
                </div>
              </div>

              {/* Firm Details */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <Building2 className="h-5 w-5 text-blue-700" />
                  <h2 className="font-semibold text-gray-900">Firm / Business Information (કંપની વિગત)</h2>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Navjivan ERP / Kundan Enterprise"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="text-xs text-gray-400">Printed as main header on all tax invoices</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      GSTIN <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={15}
                      value={form.gstin}
                      onChange={e => handleGstinChange(e.target.value)}
                      placeholder="e.g. 24AABCN1234N1Z5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">PAN Number</label>
                    <input
                      type="text"
                      maxLength={10}
                      value={form.pan}
                      onChange={e => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                      placeholder="e.g. AABCN1234N"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      <Phone className="inline h-3.5 w-3.5 mr-1" />
                      Phone / Mobile
                    </label>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      placeholder="e.g. 9825000001"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      <Mail className="inline h-3.5 w-3.5 mr-1" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="e.g. info@company.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Address Details */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <MapPin className="h-5 w-5 text-blue-700" />
                  <h2 className="font-semibold text-gray-900">Address &amp; Location (સરનામું)</h2>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Plot / Street / GIDC Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    placeholder="e.g. Plot No. 4422, L-Road, GIDC Phase 3, Dared"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={e => setForm({ ...form, city: e.target.value })}
                      placeholder="e.g. Jamnagar"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={form.state}
                      onChange={e => setForm({ ...form, state: e.target.value })}
                      placeholder="e.g. Gujarat"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    GST State Code <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={2}
                      value={form.stateCode}
                      onChange={e => setForm({ ...form, stateCode: e.target.value })}
                      placeholder="24"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono text-center focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <span className="text-xs text-gray-500">24 for Gujarat (CGST+SGST rule)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BANK & UPI DETAILS */}
          {activeTab === 'BANK' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 shadow-sm max-w-3xl">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Landmark className="h-5 w-5 text-green-700" />
                <div>
                  <h2 className="font-semibold text-gray-900">Bank &amp; Payment Details (બેંક ખાતાની વિગતો)</h2>
                  <p className="text-xs text-gray-500">These details are printed in the Bank Details box on invoices for client payments.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={form.bankName}
                    onChange={e => setForm({ ...form, bankName: e.target.value })}
                    placeholder="e.g. State Bank of India / HDFC Bank"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Branch Name</label>
                  <input
                    type="text"
                    value={form.branch}
                    onChange={e => setForm({ ...form, branch: e.target.value })}
                    placeholder="e.g. GIDC Phase 3 Branch, Jamnagar"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={form.accountNo}
                    onChange={e => setForm({ ...form, accountNo: e.target.value })}
                    placeholder="e.g. 31234567890"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={form.ifscCode}
                    onChange={e => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. SBIN0001234"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    <QrCode className="inline h-3.5 w-3.5 mr-1 text-purple-600" />
                    UPI ID / VPA
                  </label>
                  <input
                    type="text"
                    value={form.upiId}
                    onChange={e => setForm({ ...form, upiId: e.target.value })}
                    placeholder="e.g. navjivan@sbi or 9825000001@upi"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="text-xs text-gray-400">Clients can scan and pay directly via GPay, PhonePe, Paytm, or BHIM.</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INVOICE & TERMS */}
          {activeTab === 'INVOICE' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 shadow-sm max-w-3xl">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <FileText className="h-5 w-5 text-indigo-700" />
                <div>
                  <h2 className="font-semibold text-gray-900">Invoice Numbering &amp; Terms (ઇનવોઇસ સેટિંગ્સ)</h2>
                  <p className="text-xs text-gray-500">Configure standard terms of payment and invoice prefix format.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Default Invoice Prefix
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    maxLength={10}
                    value={form.invoicePrefix}
                    onChange={e => setForm({ ...form, invoicePrefix: e.target.value.toUpperCase() })}
                    placeholder="NVJ"
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="text-xs text-gray-500">
                    Example output: <strong>{form.invoicePrefix || 'NVJ'}/2026-27/001</strong>
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Standard Terms &amp; Conditions (નિયમો અને શરતો)
                </label>
                <textarea
                  rows={5}
                  value={form.termsAndConditions}
                  onChange={e => setForm({ ...form, termsAndConditions: e.target.value })}
                  placeholder="(1) Subject to Jamnagar Jurisdiction&#10;(2) Goods once sold will not be taken back..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-sans focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="text-xs text-gray-400">
                  This text automatically appears at the bottom of printed invoices.
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: LIVE BILL PREVIEW */}
          {activeTab === 'PREVIEW' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl text-sm flex items-center justify-between">
                <span>
                  <strong>Live Preview:</strong> This preview shows exactly how your company header, GSTIN, and bank details will print on A4 Tax Invoices.
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('PROFILE')}
                  className="text-xs underline font-semibold hover:text-blue-900"
                >
                  Edit details
                </button>
              </div>

              {/* Realistic Invoice Preview Box */}
              <div className="bg-white border-2 border-gray-800 p-8 rounded-lg max-w-3xl mx-auto shadow-md font-sans text-gray-900">
                {/* Header */}
                <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-4 gap-4">
                  {/* Left Logo Area (Matches uploaded red-box position) */}
                  {form.logoUrl ? (
                    <div className="w-24 h-20 shrink-0 flex items-center justify-center">
                      <img src={form.logoUrl} alt="Logo" className="max-w-24 max-h-20 object-contain" />
                    </div>
                  ) : (
                    <div
                      onClick={() => setActiveTab('PROFILE')}
                      className="w-24 h-20 shrink-0 border border-dashed border-gray-300 bg-gray-50 rounded-lg flex flex-col items-center justify-center text-[10px] text-gray-500 font-medium cursor-pointer hover:bg-gray-100 transition-colors text-center p-1"
                      title="Click to Upload Logo in Company Tab"
                    >
                      <ImageIcon className="h-5 w-5 mb-1 text-gray-400" />
                      <span>Company Logo</span>
                      <span className="text-[9px] text-blue-600 underline">Add in Profile</span>
                    </div>
                  )}

                  <div className="text-center flex-1">
                    <h3 className="text-2xl font-bold uppercase tracking-wider">{form.name || 'YOUR COMPANY NAME'}</h3>
                    <p className="text-xs mt-1 text-gray-700">
                      {form.address || 'Company Address'}, {form.city || 'Jamnagar'}, {form.state || 'Gujarat'}
                    </p>
                    <p className="text-xs text-gray-700">
                      Ph: {form.phone || '9825000000'} {form.email ? ` | Email: ${form.email}` : ''}
                    </p>
                    <p className="text-xs font-semibold mt-1">
                      GSTIN: <span className="font-mono">{form.gstin || '24AABCN1234N1Z5'}</span> | State Code: {form.stateCode || '24'}
                    </p>
                  </div>

                  {/* Spacer to keep company text perfectly centered */}
                  <div className="w-24 h-20 shrink-0 hidden sm:block" />
                </div>

                {/* Subheader */}
                <div className="text-center font-bold text-sm tracking-widest border border-black py-1 mb-4 bg-gray-100 uppercase">
                  Tax Invoice
                </div>

                {/* Mock Party & Invoice */}
                <div className="grid grid-cols-2 gap-4 text-xs border border-black p-3 mb-4">
                  <div>
                    <p className="font-bold text-gray-600 mb-1">INVOICE DETAILS</p>
                    <p>Invoice No: <strong>{form.invoicePrefix || 'NVJ'}/2627/001</strong></p>
                    <p>Date: {new Date().toLocaleDateString('en-IN')}</p>
                    <p>Place of Supply: {form.state || 'Gujarat'} (Code: {form.stateCode || '24'})</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-600 mb-1">BUYER (BILL TO)</p>
                    <p className="font-bold">M/S SAMPLE CUSTOMER TRADERS</p>
                    <p>GIDC Industrial Estate, Dared, Jamnagar</p>
                    <p>GSTIN: 24AAAPL1234P1Z1</p>
                  </div>
                </div>

                {/* Mock Items */}
                <div className="border border-black mb-4">
                  <div className="grid grid-cols-6 text-xs font-bold bg-gray-100 border-b border-black p-2 text-center">
                    <span className="text-left col-span-2">Description</span>
                    <span>HSN</span>
                    <span>Qty</span>
                    <span>Rate</span>
                    <span className="text-right">Amount</span>
                  </div>
                  <div className="grid grid-cols-6 text-xs p-2 text-center border-b border-gray-200">
                    <span className="text-left col-span-2 font-medium">Brass Hex Nut M10</span>
                    <span className="font-mono">741533</span>
                    <span>100 Gross</span>
                    <span>₹446.00</span>
                    <span className="text-right font-semibold">₹44,600.00</span>
                  </div>
                </div>

                {/* Bottom: Bank details & Terms */}
                <div className="grid grid-cols-3 gap-4 border border-black p-3 text-xs">
                  <div className="col-span-2 border-r border-gray-300 pr-3 space-y-1">
                    <p className="font-bold text-gray-800">BANK DETAILS:</p>
                    <p>Bank: <strong>{form.bankName || 'State Bank of India'}</strong></p>
                    {form.branch && <p>Branch: {form.branch}</p>}
                    <p>A/c No: <span className="font-mono font-bold">{form.accountNo || '31234567890'}</span></p>
                    <p>IFSC: <span className="font-mono font-bold">{form.ifscCode || 'SBIN0001234'}</span></p>
                    {form.upiId && <p>UPI ID: <span className="font-mono text-purple-700">{form.upiId}</span></p>}

                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <p className="font-bold text-gray-800">TERMS &amp; CONDITIONS:</p>
                      <pre className="font-sans text-[11px] whitespace-pre-wrap text-gray-600 mt-1">
                        {form.termsAndConditions || DEFAULT_COMPANY.termsAndConditions}
                      </pre>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between text-center pl-2">
                    <p className="font-bold">For, {form.name || 'YOUR COMPANY NAME'}</p>
                    <div className="h-16" />
                    <p className="border-t border-black pt-1 text-[11px] font-semibold">Authorised Signatory</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span>All company details are encrypted &amp; stored safely in MySQL database.</span>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-700 text-white font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
