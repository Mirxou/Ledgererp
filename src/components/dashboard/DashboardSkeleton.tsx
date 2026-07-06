"use client";

/* ════════════════════════════════════════════════════════════════════════════
   DASHBOARD SKELETON — Full-page skeleton matching the exact dashboard layout
   ════════════════════════════════════════════════════════════════════════════ */

function ShimmerBlock({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <div
      className={`bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer rounded-xl ${className ?? ""}`}
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

function SkeletonHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Left in RTL */}
          <div className="flex items-center gap-2">
            <ShimmerBlock className="w-9 h-9 rounded-full" delay={0} />
          </div>
          {/* Center */}
          <div className="flex items-center gap-2.5">
            <ShimmerBlock className="w-8 h-8 rounded-lg" delay={50} />
            <div className="space-y-1.5">
              <ShimmerBlock className="h-4 w-32" delay={100} />
              <ShimmerBlock className="h-2.5 w-44 hidden sm:block" delay={150} />
            </div>
          </div>
          {/* Right in RTL */}
          <div className="flex items-center gap-2">
            <ShimmerBlock className="w-8 h-8 rounded-lg" delay={200} />
            <ShimmerBlock className="w-8 h-8 rounded-lg" delay={250} />
            <ShimmerBlock className="w-8 h-8 rounded-lg" delay={300} />
          </div>
        </div>
      </div>
    </header>
  );
}

function SkeletonVerdictBanner() {
  return (
    <div className="rounded-2xl p-6 border border-border/50 overflow-hidden">
      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Score area */}
        <div className="flex-shrink-0">
          <ShimmerBlock className="w-[120px] h-[120px] rounded-full" delay={100} />
        </div>
        {/* Info area */}
        <div className="flex-1 w-full space-y-3">
          <ShimmerBlock className="h-6 w-48" delay={200} />
          <ShimmerBlock className="h-4 w-28" delay={300} />
          <div className="flex gap-2">
            <ShimmerBlock className="h-9 w-20 rounded-xl" delay={350} />
            <ShimmerBlock className="h-9 w-20 rounded-xl" delay={400} />
            <ShimmerBlock className="h-9 w-20 rounded-xl" delay={450} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonStatCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {[0, 100, 200, 300].map((d) => (
        <div key={d} className="rounded-2xl border border-border/50 p-5">
          <div className="flex items-center gap-4">
            <ShimmerBlock className="w-11 h-11 rounded-full flex-shrink-0" delay={d} />
            <div className="flex-1 space-y-2">
              <ShimmerBlock className="h-8 w-16" delay={d + 50} />
              <ShimmerBlock className="h-3 w-24" delay={d + 100} />
              <ShimmerBlock className="h-2.5 w-16" delay={d + 150} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonTabBar() {
  return (
    <div className="bg-muted/50 rounded-2xl p-1.5 flex gap-1 overflow-x-auto no-scrollbar">
      {["w-24", "w-20", "w-20", "w-20", "w-20", "w-24"].map((w, i) => (
        <ShimmerBlock
          key={i}
          className={`h-10 ${w} rounded-xl flex-shrink-0`}
          delay={i * 80}
        />
      ))}
    </div>
  );
}

function SkeletonCard({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <div className={`rounded-2xl border border-border/50 p-5 ${className ?? ""}`}>
      <div className="space-y-3">
        <ShimmerBlock className="h-5 w-36" delay={delay} />
        <ShimmerBlock className="h-3 w-52" delay={delay + 100} />
        <div className="pt-2 space-y-2">
          <ShimmerBlock className="h-32 w-full rounded-xl" delay={delay + 200} />
        </div>
      </div>
    </div>
  );
}

function SkeletonChartCircle({ delay = 0 }) {
  return (
    <div className="rounded-2xl border border-border/50 p-5">
      <ShimmerBlock className="h-5 w-28 mb-4" delay={delay} />
      <div className="flex justify-center">
        <ShimmerBlock className="w-[180px] h-[180px] rounded-full" delay={delay + 100} />
      </div>
    </div>
  );
}

function SkeletonScoreRings({ delay = 0 }) {
  return (
    <div className="rounded-2xl border border-border/50 p-5">
      <div className="grid grid-cols-2 gap-4">
        {[0, 100, 200, 300].map((d) => (
          <div key={d} className="flex flex-col items-center p-4">
            <ShimmerBlock className="w-[100px] h-[100px] rounded-full" delay={delay + d} />
            <ShimmerBlock className="h-3 w-16 mt-3" delay={delay + d + 50} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonOverviewTab() {
  return (
    <div className="space-y-6">
      {/* Row 1: FixProgress + Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SkeletonCard className="lg:col-span-2" delay={0} />
        <SkeletonChartCircle delay={100} />
      </div>

      {/* Row 2: Trend + Radar + ScoreRings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SkeletonCard delay={200} />
        <SkeletonCard delay={300} />
        <SkeletonScoreRings delay={400} />
      </div>

      {/* Row 3: Comparison + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonCard delay={500} />
        <SkeletonChartCircle delay={600} />
      </div>

      {/* Separator */}
      <div className="h-px bg-border/50" />

      {/* Treemap: full width */}
      <SkeletonCard delay={650} />

      {/* Category + File heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonCard delay={700} />
        <SkeletonCard delay={800} />
      </div>

      <div className="h-px bg-border/50" />

      {/* Security Zones: full width */}
      <SkeletonCard delay={850} />

      {/* Recommendations + Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonCard delay={900} />
        <SkeletonCard delay={950} />
      </div>

      {/* Code Quality + Tech Stack */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonCard delay={1000} />
        <SkeletonCard delay={1050} />
      </div>

      {/* Gamification: full width */}
      <SkeletonCard delay={1100} />

      {/* Activity Timeline: full width */}
      <SkeletonCard delay={1150} />
    </div>
  );
}

function SkeletonIssuesTab() {
  return (
    <div className="space-y-6">
      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <ShimmerBlock className="h-10 flex-1 rounded-lg" delay={0} />
        <ShimmerBlock className="h-10 w-40 rounded-lg" delay={100} />
      </div>
      <ShimmerBlock className="h-3 w-32" delay={150} />
      {/* Issue cards */}
      <div className="space-y-4">
        {[0, 100, 200, 300, 400].map((d) => (
          <div key={d} className="rounded-2xl border border-border/50 p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <ShimmerBlock className="w-8 h-8 rounded-lg flex-shrink-0" delay={d} />
                <div className="flex-1 space-y-2">
                  <ShimmerBlock className="h-4 w-3/4" delay={d + 50} />
                  <ShimmerBlock className="h-3 w-1/2" delay={d + 100} />
                </div>
                <ShimmerBlock className="w-16 h-6 rounded-full" delay={d + 150} />
              </div>
              <ShimmerBlock className="h-20 w-full rounded-xl" delay={d + 200} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonPiTab() {
  return (
    <div className="space-y-6">
      {/* Wallet */}
      <SkeletonCard delay={0} />
      {/* Ecosystem stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[0, 80, 160, 240, 320, 400].map((d) => (
          <div key={d} className="rounded-2xl border border-border/50 p-4">
            <ShimmerBlock className="h-5 w-24 mb-3" delay={d} />
            <ShimmerBlock className="h-8 w-16 mb-2" delay={d + 50} />
            <ShimmerBlock className="h-3 w-20" delay={d + 100} />
          </div>
        ))}
      </div>
      {/* Compliance */}
      <SkeletonCard delay={500} />
      {/* Subscription */}
      <SkeletonCard delay={600} />
      {/* Monitor */}
      <SkeletonCard delay={700} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN EXPORT
   ════════════════════════════════════════════════════════════════════════════ */

export function DashboardSkeleton({ tab = "overview" }: { tab?: string }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground" dir="rtl">
      <SkeletonHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <SkeletonVerdictBanner />
        <SkeletonStatCards />
        <SkeletonTabBar />

        {/* Tab content skeleton */}
        {tab === "overview" && <SkeletonOverviewTab />}
        {(tab === "critical" || tab === "high" || tab === "medium" || tab === "fixes") && <SkeletonIssuesTab />}
        {tab === "pi-network" && <SkeletonPiTab />}
      </main>

      <footer className="mt-auto border-t bg-white/60 dark:bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-1.5">
              <ShimmerBlock className="h-3 w-32 mx-auto sm:mx-0" delay={0} />
              <ShimmerBlock className="h-2.5 w-64 mx-auto sm:mx-0" delay={100} />
            </div>
            <div className="flex items-center gap-2">
              <ShimmerBlock className="h-5 w-14 rounded-full" delay={150} />
              <ShimmerBlock className="h-5 w-14 rounded-full" delay={200} />
              <ShimmerBlock className="h-5 w-14 rounded-full" delay={250} />
              <ShimmerBlock className="h-5 w-14 rounded-full" delay={300} />
              <ShimmerBlock className="w-7 h-7 rounded-lg" delay={350} />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}