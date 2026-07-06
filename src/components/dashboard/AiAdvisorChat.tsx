"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Sparkles, Flame, BarChart3, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

/* ── Types ─────────────────────────────────────────────────────────────── */

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

/* ── Quick Actions ─────────────────────────────────────────────────────── */

const QUICK_ACTIONS = [
  {
    label: "تحليل المشاكل الحرجة",
    icon: Flame,
    message: "ما هي المشاكل الحرجة المفتوحة حالياً؟ قدم لي تحليلاً شاملاً وأولويات الإصلاح.",
  },
  {
    label: "أفضل أولوية للإصلاح",
    icon: ShieldAlert,
    message: "بناءً على البيانات الحالية، ما هي أفضل 3 مشاكل يجب إصلاحها أولاً؟ ولماذا؟",
  },
  {
    label: "ملخص الأمان",
    icon: BarChart3,
    message: "قدم لي ملخصاً شاملاً لحالة الأمان الحالية مع نسبة التقدم.",
  },
];

/* ── Typing Indicator ──────────────────────────────────────────────────── */

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-primary/50"
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ── Markdown Components ───────────────────────────────────────────────── */

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const inline = !match;
          if (inline) {
            return (
              <code
                className="px-1.5 py-0.5 rounded bg-muted text-[11px] font-mono"
                {...props}
              >
                {children}
              </code>
            );
          }
          return (
            <div className="rounded-lg overflow-hidden my-2 border border-border/50">
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                customStyle={{
                  margin: 0,
                  padding: "12px",
                  fontSize: "12px",
                  borderRadius: "8px",
                  background: "oklch(0.15 0 0)",
                }}
                dir="ltr"
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            </div>
          );
        },
        p({ children }) {
          return <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>;
        },
        ul({ children }) {
          return <ul className="text-sm leading-relaxed space-y-1 mb-2 list-disc list-inside">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="text-sm leading-relaxed space-y-1 mb-2 list-decimal list-inside">{children}</ol>;
        },
        h3({ children }) {
          return <h3 className="text-sm font-bold mt-3 mb-1">{children}</h3>;
        },
        strong({ children }) {
          return <strong className="font-bold">{children}</strong>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────── */

export function AiAdvisorChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Welcome message ──────────────────────────────────────────── */
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current && isOpen) {
      initialized.current = true;
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "مرحباً! أنا مستشارك الأمني الذكي. اسألني أي سؤال عن أمان التطبيق.",
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen]);

  /* ── Auto-scroll ──────────────────────────────────────────────── */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  /* ── Focus input on open ──────────────────────────────────────── */
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  /* ── Send message ─────────────────────────────────────────────── */
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const conversationContext = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }))
        .slice(-6); // last 3 exchanges

      const res = await fetch("/api/ai-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          context: conversationContext,
        }),
      });

      const data = await res.json();
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.response || "عذراً، لم أتمكن من الرد.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages]);

  /* ── Handle submit ────────────────────────────────────────────── */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(input);
    },
    [sendMessage, input]
  );

  return (
    <>
      {/* ── FAB Button (bottom-left in RTL) ──────────────────────── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-20 left-4 z-[60] w-14 h-14 rounded-full
              bg-gradient-to-br from-purple-600 to-violet-700
              dark:from-purple-500 dark:to-violet-600
              shadow-[0_4px_20px_rgba(124,58,237,0.4)]
              flex items-center justify-center text-white
              hover:shadow-[0_6px_28px_rgba(124,58,237,0.55)]
              transition-shadow duration-300"
            aria-label="المستشار الذكي"
          >
            <Sparkles className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat Panel ───────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-4 left-4 z-[60] w-[calc(100vw-2rem)] sm:w-[420px]
              max-h-[70vh] rounded-2xl overflow-hidden
              bg-white/90 dark:bg-slate-900/90
              backdrop-blur-2xl
              border border-border/60 dark:border-white/10
              shadow-[0_8px_40px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.05)]
              flex flex-col"
          >
            {/* ── Header ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50
              bg-gradient-to-l from-purple-500/10 to-violet-500/5 dark:from-purple-500/5 dark:to-violet-500/2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">المستشار الذكي</h3>
                  <p className="text-[10px] text-muted-foreground">مستشارك الأمني بالذكاء الاصطناعي</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* ── Messages ────────────────────────────────────────── */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0"
              style={{ maxHeight: "calc(70vh - 180px)" }}
            >
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <MarkdownContent content={msg.content} />
                    ) : (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-end"
                >
                  <div className="bg-muted rounded-2xl rounded-bl-md">
                    <TypingIndicator />
                  </div>
                </motion.div>
              )}
            </div>

            {/* ── Quick Actions (only when no user messages) ──────── */}
            {messages.length <= 1 && !isLoading && (
              <div className="px-3 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.message)}
                    className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium
                      px-3 py-1.5 rounded-full border border-border/60 dark:border-white/10
                      bg-muted/50 hover:bg-muted dark:hover:bg-white/5
                      transition-colors flex-shrink-0"
                  >
                    <action.icon className="h-3 w-3 text-purple-500" />
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── Input ───────────────────────────────────────────── */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-3 border-t border-border/50">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اسأل عن أمان التطبيق..."
                disabled={isLoading}
                className="flex-1 h-9 px-3 text-sm rounded-xl border border-border/60
                  bg-background/50 dark:bg-white/5
                  placeholder:text-muted-foreground/60
                  focus:outline-none focus:ring-2 focus:ring-purple-500/40
                  disabled:opacity-50 transition-all"
                dir="rtl"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="h-9 w-9 rounded-xl
                  bg-gradient-to-br from-purple-600 to-violet-700
                  hover:from-purple-500 hover:to-violet-600
                  text-white shadow-lg disabled:opacity-40"
                aria-label="إرسال"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}