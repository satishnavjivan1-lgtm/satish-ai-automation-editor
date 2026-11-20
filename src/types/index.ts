export interface Party {
  id: number;
  type: 'CUSTOMER' | 'VENDOR' | 'BOTH';
  name: string;
  gstin?: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  creditLimit: number;
  openingBalance: number;
  openingBalanceType: 'DR' | 'CR';
  isActive: boolean;
}

export interface Item {
  id: number;
  name: string;
  code: string;
  hsnCode: string;
  unit: string;
  priceMode: 'PER_PIECE' | 'PER_KG' | 'PER_GRAM' | 'PER_GROSS';
  purchaseRate: number;
  saleRate: number;
  gstRate: number;
  currentQtyPcs: number;
  currentWeightKg: number;
  grossWeightKg?: number;
}

export interface Invoice {
  id: number;
  invoiceNo: string;
  type: string;
  partyId: number;
  party?: Party;
  invoiceDate: string;
  dueDate?: string;
  sellerState: string;
  customerState: string;
  gstType: 'SAME_STATE' | 'DIFF_STATE';
  subtotal: number;
  taxableAmt: number;
  cgstAmt: number;
  sgstAmt: number;
  igstAmt: number;
  roundOff: number;
  totalAmt: number;
  amountInWords: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED';
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  itemId: number;
  item?: Item;
  description: string;
  hsnCode: string;
  qtyPcs: number;
  weightKg: number;
  unit: string;
  priceMode: string;
  rate: number;
  discountPct: number;
  taxableAmt: number;
  gstRate: number;
  cgstAmt: number;
  sgstAmt: number;
  igstAmt: number;
  totalAmt: number;
}

export interface StockLedger {
  id: number;
  itemId: number;
  type: string;
  refType: string;
  refId?: number;
  qtyPcs: number;
  weightKg: number;
  rate: number;
  notes?: string;
  entryDate: string;
}

export interface JobWorkChallan {
  id: number;
  challanNo: string;
  partyId: number;
  party?: Party;
  status: 'OPEN' | 'PARTIAL' | 'CLOSED';
  challanDate: string;
  expectedReturnDate?: string;
  items: JobWorkChallanItem[];
}

export interface JobWorkChallanItem {
  id: number;
  challanId: number;
  itemId: number;
  item?: Item;
  processType: string;
  sentQtyPcs: number;
  sentWeightKg: number;
  receivedQtyPcs: number;
  receivedWeightKg: number;
  burningLossKg: number;
  burningLossPct: number;
}

export interface DashboardData {
  totalSalesMonth: number;
  totalReceivables: number;
  totalPayables: number;
  netProfit: number;
  recentInvoices: Invoice[];
  overdueInvoices: Invoice[];
}
