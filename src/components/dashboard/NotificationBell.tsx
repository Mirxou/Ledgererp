"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ShieldAlert,
  CheckCircle2,
  FileText,
} from "lucide-react";

/* ════════════════════════════════════════════════════════════════════════════
   NOTIFICATION BELL
   Shows a bell with unread indicator and a list of notifications.
   ════════════════════════════════════════════════════════════════════════════ */

interface Notification {
  id: string;
  title: string;
  description: string;
  icon: "alert" | "fixed" | "report";
  read: boolean;
  time: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    title: "تم اكتشاف ٣ مشاكل حرجة جديدة",
    description: "C-022, C-023, C-024 أُضيفت إلى التقرير",
    icon: "alert",
    read: false,
    time: "منذ ٥ دقائق",
  },
  {
    id: "n2",
    title: "تم إصلاح المشكلة C-005",
    description: "تم تغيير الحالة إلى 'تم الإصلاح' بواسطة النظام",
    icon: "fixed",
    read: false,
    time: "منذ ١٥ دقيقة",
  },
  {
    id: "n3",
    title: "تقرير الأسبوع جاهز",
    description: "ملخص التقدم الأسبوعي متاح للتحميل",
    icon: "report",
    read: true,
    time: "منذ ساعة",
  },
  {
    id: "n4",
    title: "تم إصلاح المشكلة H-012",
    description: "تغيير حالة من 'قيد التنفيذ' إلى 'تم الإصلاح'",
    icon: "fixed",
    read: true,
    time: "منذ ٣ ساعات",
  },
  {
    id: "n5",
    title: "تنبيه: رصيد Pi منخفض",
    description: "رصيدك الحالي أقل من المطلوب للترقية إلى Pro",
    icon: "alert",
    read: true,
    time: "أمس",
  },
];

const ICON_MAP = {
  alert: ShieldAlert,
  fixed: CheckCircle2,
  report: FileText,
};

const COLOR_MAP = {
  alert: "text-red-500 bg-red-50 dark:bg-red-950/30",
  fixed: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
  report: "text-purple-500 bg-purple-50 dark:bg-purple-950/30",
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

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
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-in zoom-in-50 duration-200">
              {unreadCount}
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
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-bold">الإشعارات</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-medium"
            >
              تحديد الكل كمقروء
            </button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="max-h-80">
          <div className="divide-y">
            {notifications.map((notif) => {
              const IconComponent = ICON_MAP[notif.icon];
              const colorClass = COLOR_MAP[notif.icon];
              return (
                <button
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={`w-full flex items-start gap-3 p-3.5 text-right hover:bg-muted/50 transition-colors ${
                    !notif.read ? "bg-purple-50/50 dark:bg-purple-950/10" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}
                  >
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-xs font-semibold leading-relaxed ${
                          !notif.read ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed truncate">
                      {notif.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {notif.time}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-4 py-2.5">
          <p className="text-[10px] text-muted-foreground text-center">
            {unreadCount > 0
              ? `${unreadCount} إشعار غير مقروء`
              : "لا توجد إشعارات جديدة"}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}