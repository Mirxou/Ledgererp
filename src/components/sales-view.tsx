import React, { useState } from "react";
import { FileText, Receipt } from "lucide-react";
import type { StoreData, ProductData, InvoiceData, CustomerData, LocalSaleData, InventoryData } from "@/lib/types";
import { InvoicesView } from "@/components/invoices-view";
import { LocalSalesView } from "@/components/local-sales-view";

/* ═══ Sales — Merged: Pi Invoices + Local Sales ═══ */
export function SalesView({ store, products, piUid, customers, localSales, inventory }: {
  store: StoreData; products: ProductData[]; piUid: string;
  customers: CustomerData[]; localSales: LocalSaleData[]; inventory?: InventoryData[];
}) {
  const [subTab, setSubTab] = useState<"pi" | "local">("pi");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-base">المبيعات</h2>
        <div className="flex rounded-lg border p-0.5 bg-muted/50">
          <button onClick={function() { setSubTab("pi"); }} className={"px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5" + (subTab === "pi" ? " bg-emerald-600 text-white" : " text-muted-foreground")}>
            <FileText className="h-3 w-3" />فواتير Pi
          </button>
          <button onClick={function() { setSubTab("local"); }} className={"px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5" + (subTab === "local" ? " bg-emerald-600 text-white" : " text-muted-foreground")}>
            <Receipt className="h-3 w-3" />مبيعات محلية
          </button>
        </div>
      </div>
      {subTab === "pi" ? (
        <InvoicesView store={store} products={products} piUid={piUid} />
      ) : (
        <LocalSalesView storeId={store.id} piUid={piUid} products={products} customers={customers} inventory={inventory} />
      )}
    </div>
  );
}
