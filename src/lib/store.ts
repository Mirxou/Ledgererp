import { create } from "zustand";

export interface IssueWithStatus {
  id: string;
  issueId: string;
  severity: string;
  source: string;
  file: string;
  line: number;
  category: string;
  title: string;
  description: string;
  recommendation: string;
  status: string;
  priority: number;
  effort: string;
  impact: string;
  assignee: string;
  notes: string;
  fixedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  issueId: string;
  oldStatus: string | null;
  newStatus: string | null;
  details: string;
  createdAt: string;
}

interface IssueState {
  issues: IssueWithStatus[];
  selectedIssue: IssueWithStatus | null;
  filterSeverity: string;
  filterStatus: string;
  filterSource: string;
  searchQuery: string;
  aiDialogIssue: IssueWithStatus | null;
  setIssues: (issues: IssueWithStatus[]) => void;
  setSelectedIssue: (issue: IssueWithStatus | null) => void;
  setFilterSeverity: (v: string) => void;
  setFilterStatus: (v: string) => void;
  setFilterSource: (v: string) => void;
  setSearchQuery: (v: string) => void;
  setAiDialogIssue: (issue: IssueWithStatus | null) => void;
  updateLocalIssueStatus: (issueId: string, status: string) => void;
}

export const useIssueStore = create<IssueState>((set) => ({
  issues: [],
  selectedIssue: null,
  filterSeverity: "ALL",
  filterStatus: "ALL",
  filterSource: "ALL",
  searchQuery: "",
  aiDialogIssue: null,
  setIssues: (issues) => set({ issues }),
  setSelectedIssue: (issue) => set({ selectedIssue: issue }),
  setFilterSeverity: (v) => set({ filterSeverity: v }),
  setFilterStatus: (v) => set({ filterStatus: v }),
  setFilterSource: (v) => set({ filterSource: v }),
  setSearchQuery: (v) => set({ searchQuery: v }),
  setAiDialogIssue: (issue) => set({ aiDialogIssue: issue }),
  updateLocalIssueStatus: (issueId, status) =>
    set((state) => ({
      issues: state.issues.map((i) =>
        i.issueId === issueId ? { ...i, status } : i,
      ),
    })),
}));