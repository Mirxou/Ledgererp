/** Valid invoice statuses — L7: Union type for type safety */
export type InvoiceStatus = "pending" | "paid_escrow" | "shipped" | "delivered" | "completed" | "disputed" | "cancelled" | "releasing";

export interface StoreData {
  id: string;
  piUid: string;
  name: string;
  description: string;
  avatar: string;
  isVerified: boolean;
  source: string; // "ledgererp" | "pi_connected"
  piAppUrl: string;
  slug: string | null;
  _count?: { products: number; invoices: number };
}

export interface ProductData {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  costPrice: number;
  sku: string;
  stockQuantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  categoryId: string | null;
  unit: string;
  image: string;
  isActive: boolean;
  createdAt: string;
  category?: { id: string; nameAr: string; nameEn: string; color: string; slug: string };
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

export interface CategoryData {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  icon: string;
  color: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { products: number };
  children?: CategoryData[];
}

export interface InventoryData {
  id: string;
  productId: string;
  storeId: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity?: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  version?: number;
  lastRestockedAt: string | null;
  product?: { id: string; name: string; sku: string; category?: { id: string; nameAr: string; nameEn: string } };
  isLowStock?: boolean;
}

export interface InventoryMovementData {
  id: string;
  inventoryId: string;
  type: string;
  quantity: number;
  reason: string;
  referenceId: string;
  createdBy: string;
  createdAt: string;
  inventory?: { id: string; productId: string; product?: { id: string; name: string; sku: string } };
}

export interface CustomerData {
  id: string;
  storeId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  piUid: string | null;
  notes: string;
  totalSpent: number;
  totalOrders: number;
  isActive: boolean;
  createdAt: string;
}

export interface LocalSaleData {
  id: string;
  storeId: string;
  customerId: string | null;
  invoiceNumber: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  items?: LocalSaleItemData[];
  customer?: { id: string; name: string; phone: string };
}

export interface LocalSaleItemData {
  id: string;
  localSaleId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ExpenseData {
  id: string;
  storeId: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  receipt: string;
  createdBy: string;
  createdAt: string;
}

export interface TransactionLogData {
  id: string;
  storeId: string;
  invoiceId: string | null;
  type: string;
  amount: number;
  currency: string;
  description: string;
  reference: string;
  createdBy: string;
  createdAt: string;
}
