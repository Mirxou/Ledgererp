"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, ShieldAlert, CheckCircle2, FileText, CreditCard, Truck, Wallet, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/* ════════════════════════════════════════════════════════════════════════════
   NOTIFICATION BELL (DB-backed)
   Shows a bell with unread indicator and a list of notifications.
   Fetches from /api/notifications (persisted in DB).
   ════════════════════════════════════════════════════════════════════════════ */

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  read: boolean;
  createdAt: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  payment: CreditCard,
  order: FileText,
  escrow: Wallet,
  delivery: Truck,
  dispute: ShieldAlert,
  system: CheckCircle2,
  store: Store,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-500 bg-red-50 dark:bg-red-950/30",
  high: "text-orange-500 bg-orange-50 dark:bg-orange-950/30",
  medium: "text-amber-500 bg-amber-50 dark:bg-amber-950/30",
  low: "text-blue-500 bg-blue-50 dark:bg-blue-950/30",
  info: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
};

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

export function NotificationBell({ piUid }: { piUid: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Fetch notifications from API
  useEffect(() => {
    if (!piUid) return;
    let cancelled = false;

    fetch("/api/notifications", {
      headers: { "X-Pi-UID": piUid },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.notifications) {
          setNotifications(data.notifications);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [piUid, open]); // refetch when popover opens

  const markAllRead = useCallback(() => {
    fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Pi-UID": piUid },
      body: JSON.stringify({ markAll: true }),
    }).then(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }).catch(() => {});
  }, [piUid]);

  const markAsRead = useCallback((id: string) => {
    fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Pi-UID": piUid },
      body: JSON.stringify({ id }),
    }).then(() => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    }).catch(() => {});
  }, [piUid]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 relative"
          aria-label="الإشعارات"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-in zoom-in-50 duration-200">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-80 sm:w-96 p-0 animate-in fade-in-0 slide-in-from-top-2 duration-200"
        dir="rtl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-bold">الإشعارات</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
            >
              تحديد الكل كمقروء
            </button>
          )}
        </div>

        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {loading ? "جارٍ التحميل..." : "لا توجد إشعارات"}
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => {
                const IconComponent = ICON_MAP[notif.type] || FileText;
                const colorClass = SEVERITY_COLORS[notif.severity] || SEVERITY_COLORS.info;
                return (
                  <button
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={`w-full flex items-start gap-3 p-3.5 text-right hover:bg-muted/50 transition-colors ${
                      !notif.read ? "bg-emerald-50/50 dark:bg-emerald-950/10" : ""
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-semibold leading-relaxed ${!notif.read ? "text-foreground" : "text-muted-foreground"}`}>
                          {notif.title}
                        </p>
                        {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed truncate">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {getTimeAgo(notif.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="border-t px-4 py-2.5">
          <p className="text-[10px] text-muted-foreground text-center">
            {unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : "لا توجد إشعارات جديدة"}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
