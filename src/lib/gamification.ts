/* ════════════════════════════════════════════════════════════════════════════
   GAMIFICATION ENGINE — Types, XP, Levels, Achievements
   ════════════════════════════════════════════════════════════════════════════ */

/* ── Types ────────────────────────────────────────────────────────────── */

export interface Achievement {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  icon: string; // Lucide icon name
  category: "fix" | "streak" | "level" | "category" | "special";
  requirement: number;
  unlockedAt?: string;
}

export interface UserProfile {
  level: number;
  xp: number;
  totalFixed: number;
  streak: number;
  achievements: string[];
}

export interface GamificationStats {
  criticalFixed: number;
  highFixed: number;
  mediumFixed: number;
  lowFixed: number;
  totalFixed: number;
  xp: number;
  xpBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

/* ── XP Constants ─────────────────────────────────────────────────────── */

export const XP_PER_SEVERITY: Record<string, number> = {
  CRITICAL: 50,
  HIGH: 30,
  MEDIUM: 15,
  LOW: 5,
};

export const XP_PER_LEVEL = 200;

/* ── Level System ─────────────────────────────────────────────────────── */

export const LEVEL_TITLES: Record<number, string> = {
  1: "مبتدئ",
  2: "محلل",
  3: "محلل",
  4: "خبير",
  5: "خبير",
  6: "محترف",
  7: "محترف",
  8: "محترف",
  9: "محترف",
  10: "أسطورة",
};

export function getLevelTitle(level: number): string {
  if (level <= 1) return LEVEL_TITLES[1];
  if (level <= 3) return LEVEL_TITLES[2];
  if (level <= 5) return LEVEL_TITLES[4];
  if (level <= 9) return LEVEL_TITLES[6];
  return LEVEL_TITLES[10];
}

/* ── Core Functions ───────────────────────────────────────────────────── */

export function calculateLevel(xp: number): number {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
}

export function getXpForNextLevel(xp: number): {
  currentXp: number;
  xpForNext: number;
  progress: number; // 0-1
} {
  const level = calculateLevel(xp);
  const currentLevelBase = (level - 1) * XP_PER_LEVEL;
  const nextLevelBase = level * XP_PER_LEVEL;
  const currentXp = xp - currentLevelBase;
  const xpForNext = XP_PER_LEVEL;
  const progress = Math.min(1, currentXp / xpForNext);
  return { currentXp, xpForNext, progress };
}

/* ── Pre-defined Achievements ─────────────────────────────────────────── */

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_fix",
    title: "First Fix",
    titleAr: "أول إصلاح",
    description: "Fix your first issue",
    descriptionAr: "أصلح أول مشكلة",
    icon: "Wrench",
    category: "fix",
    requirement: 1,
  },
  {
    id: "critical_hunter",
    title: "Critical Hunter",
    titleAr: "صياد الحرج",
    description: "Fix 5 critical issues",
    descriptionAr: "أصلح 5 مشاكل حرجة",
    icon: "Flame",
    category: "fix",
    requirement: 5,
  },
  {
    id: "security_advisor",
    title: "Security Advisor",
    titleAr: "مستشار أمني",
    description: "Fix 20 issues total",
    descriptionAr: "أصلح 20 مشكلة",
    icon: "Shield",
    category: "fix",
    requirement: 20,
  },
  {
    id: "encryption_hero",
    title: "Encryption Hero",
    titleAr: "بطل التشفير",
    description: "Fix all encryption issues",
    descriptionAr: "أصلح جميع مشاكل التشفير",
    icon: "Lock",
    category: "category",
    requirement: 0, // special: all encryption fixed
  },
  {
    id: "auth_guardian",
    title: "Auth Guardian",
    titleAr: "حارس المصادقة",
    description: "Fix all authentication issues",
    descriptionAr: "أصلح جميع مشاكل المصادقة",
    icon: "ShieldCheck",
    category: "category",
    requirement: 0,
  },
  {
    id: "xss_expert",
    title: "XSS Expert",
    titleAr: "خبير XSS",
    description: "Fix all XSS issues",
    descriptionAr: "أصلح جميع ثغرات XSS",
    icon: "Bug",
    category: "category",
    requirement: 0,
  },
  {
    id: "persistent",
    title: "Persistent",
    titleAr: "مثابر",
    description: "Fix 10 issues in one day",
    descriptionAr: "أصلح 10 مشاكل في يوم واحد",
    icon: "Flame",
    category: "streak",
    requirement: 10,
  },
  {
    id: "team_leader",
    title: "Team Leader",
    titleAr: "قائد الفريق",
    description: "Reach level 5",
    descriptionAr: "وصل للمستوى 5",
    icon: "Crown",
    category: "level",
    requirement: 5,
  },
  {
    id: "security_legend",
    title: "Security Legend",
    titleAr: "أسطورة الأمان",
    description: "Reach level 10",
    descriptionAr: "وصل للمستوى 10",
    icon: "Crown",
    category: "level",
    requirement: 10,
  },
  {
    id: "code_cleaner",
    title: "Code Cleaner",
    titleAr: "منظف الكود",
    description: "Fix all code quality issues",
    descriptionAr: "أصلح جميع مشاكل جودة الكود",
    icon: "Sparkles",
    category: "category",
    requirement: 0,
  },
  {
    id: "pi_guardian",
    title: "Pi Network Guardian",
    titleAr: "حارس شبكة بي",
    description: "Fix all Pi Network issues",
    descriptionAr: "أصلح جميع مشاكل شبكة بي",
    icon: "Globe",
    category: "category",
    requirement: 0,
  },
  {
    id: "perfectionist",
    title: "Perfectionist",
    titleAr: "كمالي",
    description: "Fix all 95 issues",
    descriptionAr: "أصلح جميع الـ 95 مشكلة",
    icon: "Trophy",
    category: "special",
    requirement: 95,
  },
];

/* ── Achievement Progress ─────────────────────────────────────────────── */

export interface AchievementProgress {
  achievement: Achievement;
  current: number;
  total: number;
  isUnlocked: boolean;
  progress: number; // 0-1
}

export function getAchievementProgress(
  achievement: Achievement,
  stats: {
    totalFixed: number;
    criticalFixed: number;
    encryptionFixed: number;
    encryptionTotal: number;
    authFixed: number;
    authTotal: number;
    xssFixed: number;
    xssTotal: number;
    codeQualityFixed: number;
    codeQualityTotal: number;
    piFixed: number;
    piTotal: number;
    level: number;
    fixedToday: number;
  },
  unlockedIds: string[]
): AchievementProgress {
  const isUnlocked = unlockedIds.includes(achievement.id);
  let current = 0;
  let total = 1;

  switch (achievement.id) {
    case "first_fix":
      current = Math.min(stats.totalFixed, 1);
      total = 1;
      break;
    case "critical_hunter":
      current = stats.criticalFixed;
      total = 5;
      break;
    case "security_advisor":
      current = stats.totalFixed;
      total = 20;
      break;
    case "encryption_hero":
      current = stats.encryptionFixed;
      total = stats.encryptionTotal || 1;
      break;
    case "auth_guardian":
      current = stats.authFixed;
      total = stats.authTotal || 1;
      break;
    case "xss_expert":
      current = stats.xssFixed;
      total = stats.xssTotal || 1;
      break;
    case "persistent":
      current = stats.fixedToday;
      total = 10;
      break;
    case "team_leader":
      current = stats.level;
      total = 5;
      break;
    case "security_legend":
      current = stats.level;
      total = 10;
      break;
    case "code_cleaner":
      current = stats.codeQualityFixed;
      total = stats.codeQualityTotal || 1;
      break;
    case "pi_guardian":
      current = stats.piFixed;
      total = stats.piTotal || 1;
      break;
    case "perfectionist":
      current = stats.totalFixed;
      total = 95;
      break;
  }

  return {
    achievement,
    current: Math.min(current, total),
    total,
    isUnlocked,
    progress: isUnlocked ? 1 : Math.min(1, current / total),
  };
}

/* ── Check & Unlock ───────────────────────────────────────────────────── */

export function checkAndUnlockAchievements(
  stats: {
    totalFixed: number;
    criticalFixed: number;
    encryptionFixed: number;
    encryptionTotal: number;
    authFixed: number;
    authTotal: number;
    xssFixed: number;
    xssTotal: number;
    codeQualityFixed: number;
    codeQualityTotal: number;
    piFixed: number;
    piTotal: number;
    level: number;
    fixedToday: number;
  },
  currentlyUnlocked: string[]
): { newUnlocks: string[]; allUnlocked: string[] } {
  const newUnlocks: string[] = [];
  const allUnlocked = [...currentlyUnlocked];

  for (const ach of ACHIEVEMENTS) {
    if (allUnlocked.includes(ach.id)) continue;

    let shouldUnlock = false;

    switch (ach.id) {
      case "first_fix":
        shouldUnlock = stats.totalFixed >= 1;
        break;
      case "critical_hunter":
        shouldUnlock = stats.criticalFixed >= 5;
        break;
      case "security_advisor":
        shouldUnlock = stats.totalFixed >= 20;
        break;
      case "encryption_hero":
        shouldUnlock = stats.encryptionTotal > 0 && stats.encryptionFixed >= stats.encryptionTotal;
        break;
      case "auth_guardian":
        shouldUnlock = stats.authTotal > 0 && stats.authFixed >= stats.authTotal;
        break;
      case "xss_expert":
        shouldUnlock = stats.xssTotal > 0 && stats.xssFixed >= stats.xssTotal;
        break;
      case "persistent":
        shouldUnlock = stats.fixedToday >= 10;
        break;
      case "team_leader":
        shouldUnlock = stats.level >= 5;
        break;
      case "security_legend":
        shouldUnlock = stats.level >= 10;
        break;
      case "code_cleaner":
        shouldUnlock = stats.codeQualityTotal > 0 && stats.codeQualityFixed >= stats.codeQualityTotal;
        break;
      case "pi_guardian":
        shouldUnlock = stats.piTotal > 0 && stats.piFixed >= stats.piTotal;
        break;
      case "perfectionist":
        shouldUnlock = stats.totalFixed >= 95;
        break;
    }

    if (shouldUnlock) {
      newUnlocks.push(ach.id);
      allUnlocked.push(ach.id);
    }
  }

  return { newUnlocks, allUnlocked };
}