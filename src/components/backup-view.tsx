"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Database, Download, Upload, Trash2, Clock, HardDrive,
  Loader2, CheckCircle2, AlertTriangle, RefreshCw, Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface BackupInfo {
  filename: string;
  size: number;
  sizeFormatted: string;
  createdAt: string;
}

interface BackupViewProps {
  piUid: string;
}

/* ═══ Backup View ═══ */
export function BackupView({ piUid }: BackupViewProps) {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const toast = useToast().toast;

  const fetchBackups = useCallback(async function() {
    try {
      const res = await fetch("/api/backup?list=true", {
        headers: { "X-Demo-Uid": piUid },
      });
      if (!res.ok) throw new Error("Failed to fetch backups");
      const data = await res.json();
      setBackups(data.backups || []);
      if (data.backups && data.backups.length > 0) {
        setLastBackupTime(data.backups[0].createdAt);
      } else {
        setLastBackupTime(null);
      }
    } catch {
      toast({ title: "فشل تحميل النسخ الاحتياطية", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [piUid, toast]);

  useEffect(function() {
    fetchBackups();
  }, [fetchBackups]);

  const handleCreateBackup = async function() {
    setCreating(true);
    try {
      const res = await fetch("/api/backup", {
        headers: { "X-Demo-Uid": piUid },
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "فشل إنشاء النسخة الاحتياطية", variant: "destructive" });
        return;
      }
      toast({ title: "تم إنشاء نسخة احتياطية بنجاح", description: data.filename });
      await fetchBackups();
    } catch {
      toast({ title: "فشل إنشاء النسخة الاحتياطية", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async function(filename: string) {
    setRestoring(filename);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Demo-Uid": piUid,
          "X-User-Role": "manager",
        },
        body: JSON.stringify({ filename }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "فشل الاستعادة", variant: "destructive" });
        return;
      }
      toast({
        title: "تمت الاستعادة بنجاح",
        description: `تم إنشاء نسخة أمان: ${data.safetyBackup}`,
      });
      await fetchBackups();
    } catch {
      toast({ title: "فشل الاستعادة من النسخة الاحتياطية", variant: "destructive" });
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async function(filename: string) {
    setDeleting(filename);
    try {
      const res = await fetch("/api/backup", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-Demo-Uid": piUid,
        },
        body: JSON.stringify({ filename }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "فشل الحذف", variant: "destructive" });
        return;
      }
      toast({ title: "تم حذف النسخة الاحتياطية" });
      await fetchBackups();
    } catch {
      toast({ title: "فشل حذف النسخة الاحتياطية", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  const totalSize = backups.reduce(function(sum, b) { return sum + b.size; }, 0);
  const formatTotalSize = function(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const fmtDate = function(d: string) {
    return new Date(d).toLocaleDateString("ar-DZ", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const timeSince = function(d: string): string {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "الآن";
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `منذ ${days} يوم`;
  };

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-500" />
            النسخ الاحتياطي
          </h3>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            {backups.length} / 10
          </Badge>
        </div>
        <Button
          onClick={handleCreateBackup}
          disabled={creating}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
        >
          {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          إنشاء نسخة احتياطية
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-muted/40 rounded-lg p-2.5 text-center">
          <HardDrive className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground">الحجم الكلي</p>
          <p className="text-xs font-bold">{formatTotalSize(totalSize)}</p>
        </div>
        <div className="bg-muted/40 rounded-lg p-2.5 text-center">
          <Database className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground">عدد النسخ</p>
          <p className="text-xs font-bold">{backups.length}</p>
        </div>
        <div className="bg-muted/40 rounded-lg p-2.5 text-center">
          <Clock className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground">آخر نسخة</p>
          <p className="text-xs font-bold">{lastBackupTime ? timeSince(lastBackupTime) : "—"}</p>
        </div>
      </div>

      {/* Last Backup Indicator */}
      {lastBackupTime && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span>آخر نسخة احتياطية: {fmtDate(lastBackupTime)}</span>
        </div>
      )}

      {/* Backup List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-bold flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-emerald-500" />
            قائمة النسخ الاحتياطية
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-30" />
              لا توجد نسخ احتياطية بعد
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {backups.map(function(backup) {
                const isRestoring = restoring === backup.filename;
                const isDeleting = deleting === backup.filename;
                return (
                  <div
                    key={backup.filename}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                  >
                    <Database className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-mono truncate" dir="ltr">{backup.filename}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{backup.sizeFormatted}</span>
                        <span className="text-[10px] text-muted-foreground">•</span>
                        <span className="text-[10px] text-muted-foreground">{fmtDate(backup.createdAt)}</span>
                      </div>
                    </div>

                    {/* Restore Button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isRestoring || isDeleting}
                          className="shrink-0 h-7 w-7 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        >
                          {isRestoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-sm flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            تأكيد الاستعادة
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-xs space-y-2">
                            <p>سيتم استبدال قاعدة البيانات الحالية بهذه النسخة الاحتياطية.</p>
                            <p className="font-mono text-[10px] bg-muted/50 p-2 rounded" dir="ltr">{backup.filename}</p>
                            <p className="text-amber-600 font-medium">⚠️ سيتم إنشاء نسخة أمان تلقائياً قبل الاستعادة.</p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="text-xs">إلغاء</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={function() { handleRestore(backup.filename); }}
                            className="text-xs bg-amber-600 hover:bg-amber-700"
                          >
                            استعادة
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {/* Delete Button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isRestoring || isDeleting}
                          className="shrink-0 h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-sm">حذف النسخة الاحتياطية؟</AlertDialogTitle>
                          <AlertDialogDescription className="text-xs">
                            سيتم حذف &quot;{backup.filename}&quot; نهائياً. لا يمكن التراجع.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="text-xs">إلغاء</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={function() { handleDelete(backup.filename); }}
                            className="text-xs bg-red-600 hover:bg-red-700"
                          >
                            حذف
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={function() { setLoading(true); fetchBackups(); }}
          className="text-xs text-muted-foreground gap-1.5"
        >
          <RefreshCw className="h-3 w-3" />
          تحديث القائمة
        </Button>
      </div>
    </div>
  );
}
