import { create } from "zustand";

/**
 * Escrow platform state — manages invoice issue/dispute viewing.
 * This store is for the UI state only; all data is persisted in the database.
 */

export interface InvoiceIssue {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  customerName: string;
  customerPiUid: string;
  storeName: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface IssueState {
  issues: InvoiceIssue[];
  selectedIssue: InvoiceIssue | null;
  filterStatus: string;
  searchQuery: string;
  setIssues: (issues: InvoiceIssue[]) => void;
  setSelectedIssue: (issue: InvoiceIssue | null) => void;
  setFilterStatus: (v: string) => void;
  setSearchQuery: (v: string) => void;
}

export const useIssueStore = create<IssueState>((set) => ({
  issues: [],
  selectedIssue: null,
  filterStatus: "ALL",
  searchQuery: "",
  setIssues: (issues) => set({ issues }),
  setSelectedIssue: (issue) => set({ selectedIssue: issue }),
  setFilterStatus: (v) => set({ filterStatus: v }),
  setSearchQuery: (v) => set({ searchQuery: v }),
}));
