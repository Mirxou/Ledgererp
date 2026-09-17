/** Valid invoice statuses — L7: Union type for type safety */
export type InvoiceStatus = "pending" | "paid_escrow" | "shipped" | "delivered" | "completed" | "disputed" | "cancelled" | "releasing";

export interface StoreData {
  id: string;
  piUid: string;
  name: string;
  description: string;
  avatar: string;
  isVerified: boolean;
  _count?: { products: number; invoices: number };
}

export interface ProductData {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isActive: boolean;
  createdAt: string;
}

export interface InvoiceItemData {
  id?: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  storeId: string;
  customerPiUid: string;
  customerName: string;
  subtotal: number;
  escrowFee: number;
  total: number;
  status: InvoiceStatus;
  notes: string;
  paymentTxId: string;
  releaseTxId: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  items: InvoiceItemData[];
  store?: { name: string; piUid: string };
}
