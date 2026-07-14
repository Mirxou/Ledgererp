"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Lock, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/charts/ScoreRing";

/* ════════════════════════════════════════════════════════════════════════════
   TYPES
   ════════════════════════════════════════════════════════════════════════════ */

interface Transaction {
  type: "received" | "sent" | "stake";
  amount: string;
  counterparty: string;
  time: string;
}

const SIMULATED_TRANSACTIONS: Transaction[] = [
  { type: "received", amount: "150.00", counterparty: "PiWork", time: "منذ 2 ساعة" },
  { type: "sent", amount: "25.50", counterparty: "PiMall", time: "منذ 5 ساعات" },
  { type: "stake", amount: "500.00", counterparty: "عقد التخزين", time: "منذ 1 يوم" },
  { type: "received", amount: "320.75", counterparty: "PiChat", time: "منذ 2 يوم" },
  { type: "sent", amount: "12.00", counterparty: "PiGameHub", time: "منذ 3 يوم" },
];

const PI_BALANCE = 1234.56;
const USD_ESTIMATE = 38.72;

/* ════════════════════════════════════════════════════════════════════════════
   PI LOGO SVG WITH ANIMATED PULSE RING
   ════════════════════════════════════════════════════════════════════════════ */

function PiLogoWithPulse() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Outer pulse ring 1 */}
      <motion.div
        className="absolute rounded-full border-2 border-purple-400/40 dark:border-purple-400/30"
        initial={{ width: 64, height: 64, opacity: 0.6 }}
        animate={{ width: 110, height: 110, opacity: 0 }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
      />
      {/* Outer pulse ring 2 */}
      <motion.div
        className="absolute rounded-full border-2 border-purple-400/30 dark:border-purple-400/20"
        initial={{ width: 64, height: 64, opacity: 0.4 }}
        animate={{ width: 100, height: 100, opacity: 0 }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
      />

      {/* Main Pi circle */}
      <motion.div
        className="relative w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, oklch(0.55 0.25 295), oklch(0.40 0.20 270))",
          boxShadow: "0 0 30px oklch(0.55 0.25 295 / 30%), 0 0 60px oklch(0.55 0.25 295 / 15%)",
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <text x="16" y="23" textAnchor="middle" fontSize="22" fontWeight="bold" fill="white" fontFamily="serif">π</text>
        </svg>
      </motion.div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   TRANSACTION ROW
   ════════════════════════════════════════════════════════════════════════════ */

function TransactionRow({ tx, index }: { tx: Transaction; index: number }) {
  const isReceived = tx.type === "received";
  const isStake = tx.type === "stake";

  const iconBg = isReceived
    ? "bg-green-100 dark:bg-green-900/40"
    : isStake
      ? "bg-purple-100 dark:bg-purple-900/40"
      : "bg-orange-100 dark:bg-orange-900/40";

  const iconColor = isReceived
    ? "text-green-600 dark:text-green-400"
    : isStake
      ? "text-purple-600 dark:text-purple-400"
      : "text-orange-600 dark:text-orange-400";

  const Icon = isReceived ? ArrowDownLeft : isStake ? Lock : ArrowUpRight;
  const amountColor = isReceived
    ? "text-green-600 dark:text-green-400"
    : isStake
      ? "text-purple-600 dark:text-purple-400"
      : "text-orange-600 dark:text-orange-400";

  const typeLabel = isReceived ? "مستلم" : isStake ? "مُخزّن" : "مُرسل";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{tx.counterparty}</p>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 flex-shrink-0">{typeLabel}</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground">{tx.time}</p>
      </div>
      <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${amountColor}`}>
        {isReceived ? "+" : isStake ? "" : "-"}{tx.amount} π
      </span>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ANIMATED COUNTER FOR DECIMAL VALUES
   ════════════════════════════════════════════════════════════════════════════ */

function AnimatedDecimal({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    const start = performance.now();
    const duration = 1500;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(2, -10 * progress);
      setDisplay(eased * value);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  return (
    <span>
      {prefix}
      {display.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      {suffix}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT — PiWalletCard
   Glassmorphism card with Pi purple gradient border.
   ════════════════════════════════════════════════════════════════════════════ */

export function PiWalletCard() {
  const [balanceHidden, setBalanceHidden] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative rounded-2xl overflow-hidden"
    >
      {/* Animated gradient border */}
      <div className="absolute -inset-[2px] rounded-2xl overflow-hidden">
        <div
          className="absolute inset-0 animate-wallet-border-spin"
          style={{
            background: "conic-gradient(from 0deg, oklch(0.55 0.25 295 / 80%), oklch(0.75 0.18 80 / 60%), oklch(0.55 0.25 295 / 40%), oklch(0.75 0.18 80 / 80%), oklch(0.55 0.25 295 / 80%))",
            filter: "blur(1px)",
          }}
        />
      </div>

      {/* Glassmorphism card body */}
      <Card
        className="relative z-10 border-0 overflow-hidden"
        style={{
          background: [
            "radial-gradient(ellipse at 30% 20%, oklch(0.55 0.25 295 / 12%) 0%, transparent 50%)",
            "radial-gradient(ellipse at 70% 80%, oklch(0.75 0.18 80 / 8%) 0%, transparent 50%)",
            "linear-gradient(135deg, oklch(0.15 0.01 280 / 90%) 0%, oklch(0.12 0 0 / 95%) 100%)",
          ].join(", "),
          backdropFilter: "blur(20px) saturate(1.4)",
          WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        }}
      >
        <CardContent className="p-5 sm:p-6">
          {/* Top section: Logo + Balance */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Pi Logo */}
            <PiLogoWithPulse />

            {/* Balance Info */}
            <div className="flex-1 text-center sm:text-right w-full">
              <div className="flex items-center justify-center sm:justify-end gap-2 mb-1">
                <span className="text-xs text-muted-foreground font-medium">رصيدك</span>
                <button
                  onClick={() => setBalanceHidden(!balanceHidden)}
                  className="p-1 rounded-md hover:bg-muted/40 transition-colors"
                  aria-label={balanceHidden ? "إظهار الرصيد" : "إخفاء الرصيد"}
                >
                  {balanceHidden
                    ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              </div>

              {balanceHidden ? (
                <motion.p
                  key="hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-2xl sm:text-3xl font-black pi-gradient-text tracking-tight"
                >
                  •••••• π
                </motion.p>
              ) : (
                <motion.p
                  key="visible"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-2xl sm:text-3xl font-black pi-gradient-text tracking-tight"
                >
                  <AnimatedNumber value={Math.floor(PI_BALANCE)} />,<AnimatedDecimal value={PI_BALANCE % 1} />
                  {" "}π
                </motion.p>
              )}

              <p className="text-xs text-muted-foreground mt-1">
                القيمة التقديرية:{" "}
                <span className="text-foreground font-semibold">
                  {balanceHidden ? "••••" : `$${USD_ESTIMATE.toFixed(2)}`}
                </span>{" "}
                USD
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mt-4 justify-center sm:justify-end">
                <Button
                  size="sm"
                  className="rounded-xl gap-1.5 text-xs font-semibold"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.55 0.25 295), oklch(0.45 0.20 270))",
                    color: "white",
                    border: "none",
                  }}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  إرسال π
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5 text-xs font-semibold border-purple-300/40 dark:border-purple-700/40 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                >
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  استقبال π
                </Button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="my-5 h-px bg-gradient-to-l from-transparent via-purple-500/30 to-transparent" />

          {/* Mini Transaction History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">آخر المعاملات</h4>
              <Badge variant="outline" className="text-[9px] px-2 py-0.5">
                {SIMULATED_TRANSACTIONS.length} معاملة
              </Badge>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
              {SIMULATED_TRANSACTIONS.map((tx, i) => (
                <TransactionRow key={i} tx={tx} index={i} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}