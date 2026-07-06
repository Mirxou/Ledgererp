"use client";

import { useQuery } from "@tanstack/react-query";
import { Box, Zap, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface LiveMetrics {
  tps: number;
  blockHeight: number;
  mempoolSize: number;
  networkHealth: string;
  uptime: string;
}

export function PiNetworkStatus() {
  const { data } = useQuery<{ liveMetrics: LiveMetrics }>({
    queryKey: ["pi-status"],
    queryFn: async () => {
      const res = await fetch("/api/pi-stats");
      if (!res.ok) throw new Error();
      return res.json();
    },
    refetchInterval: 10000,
  });

  const health = data?.liveMetrics.networkHealth ?? "...";
  const isGood = health === "ممتاز";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2.5 text-[11px] font-medium"
          aria-label="حالة شبكة بي"
        >
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isGood ? "bg-green-400" : "bg-yellow-400"} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isGood ? "bg-green-500" : "bg-yellow-500"}`} />
          </span>
          <span className="hidden sm:inline">Pi: متصل</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" side="bottom" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">حالة شبكة بي</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isGood
                ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400"
            }`}>
              {health}
            </span>
          </div>
          <div className="space-y-2">
            <MiniStat icon={<Box className="h-3.5 w-3.5 text-purple-500" />} label="ارتفاع الكتلة" value={data?.liveMetrics.blockHeight.toLocaleString("ar-EG") ?? "—"} />
            <MiniStat icon={<Zap className="h-3.5 w-3.5 text-amber-500" />} label="TPS" value={String(data?.liveMetrics.tps ?? "—")} />
            <MiniStat icon={<Activity className="h-3.5 w-3.5 text-sky-500" />} label="ذاكرة المعاملات" value={String(data?.liveMetrics.mempoolSize ?? "—")} />
          </div>
          <p className="text-[9px] text-muted-foreground text-center">يُحدّث كل 10 ثوانٍ</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      {icon}
      <span className="text-muted-foreground flex-1">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}