"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, ExternalLink, ShieldAlert } from "lucide-react";
import { AuditReport, CARD_DEPTH, SECURITY_ZONES } from "@/lib/audit-data";

/* ════════════════════════════════════════════════════════════════════════════
   SECURITY ZONES (Collapsible)
   ════════════════════════════════════════════════════════════════════════════ */

export function SecurityZones({
  report,
  securityOpen,
  onToggleZone,
  onOpenIssue,
}: {
  report: AuditReport;
  securityOpen: Record<string, boolean>;
  onToggleZone: (title: string) => void;
  onOpenIssue: (issue: AuditReport["criticalFindings"][0]) => void;
}) {
  return (
    <Card className={CARD_DEPTH}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />المناطق الأمنية
        </CardTitle>
        <CardDescription>انقر على أي منطقة لتوسيع المشاكل المتعلقة بها</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {SECURITY_ZONES.map((zone) => {
          const issues = report.criticalFindings.filter((i) =>
            zone.filter.some((f) => i.category.includes(f)),
          );
          return (
            <Collapsible
              key={zone.title}
              open={securityOpen[zone.title] ?? false}
              onOpenChange={() => onToggleZone(zone.title)}
            >
              <CollapsibleTrigger
                className="w-full flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-muted-foreground/5 transition-colors min-h-[44px]"
                aria-label={zone.title}
              >
                <zone.icon className={`h-4 w-4 flex-shrink-0 ${zone.color}`} />
                <span className="text-sm font-medium flex-1 text-right">{zone.title}</span>
                <Badge variant="outline" className="text-[10px]">{issues.length}</Badge>
                {securityOpen[zone.title]
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                {issues.length > 0 ? (
                  <div className="pr-10 pb-3 space-y-1.5">
                    {issues.map((issue) => (
                      <button
                        key={issue.id}
                        onClick={() => onOpenIssue(issue)}
                        className="w-full text-right text-xs text-muted-foreground hover:text-foreground py-1.5 px-2 rounded-lg hover:bg-muted-foreground/5 transition-colors min-h-[36px] flex items-center gap-2"
                      >
                        <span className="font-mono text-[10px] text-muted-foreground/60">{issue.id}</span>
                        <span className="truncate flex-1">{issue.title}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="pr-10 pb-3">
                    <p className="text-xs text-muted-foreground/60 py-1">لا توجد مشاكل في هذه المنطقة</p>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}