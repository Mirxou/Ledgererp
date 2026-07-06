---
Task ID: 4
Agent: Phase 3 — AI-Powered Security Engine + Issue Tracking with Prisma
Task: محرك أمان بالذكاء الاصطناعي + تتبع المشاكل مع Prisma

Work Log:
- Task 1: تحديث prisma/schema.prisma — إنشاء نموذجين (AuditIssue + AuditLog)
- Task 2: إنشاء prisma/seed.ts — بذر 95 مشكلة من بيانات التدقيق
- Task 3: إنشاء 3 نقاط نهاية API (issues, issues/[id], ai-analysis)
- Task 4: إنشاء src/lib/store.ts — مخزن Zustand
- Task 5: تحديث CriticalIssueCard.tsx — إدارة الحالة + تحليل ذكي
- Task 6: تحديث IssueRow.tsx — إدارة حالة مدمجة
- Task 7: إنشاء AiAnalysisDialog.tsx — حوار تحليل ذكي
- Task 8: إنشاء FixProgressCard.tsx — تقدم الإصلاحات
- Task 9: إنشاء FixTimeline.tsx — سجل النشاط
- Task 10: ربط كل شيء في page.tsx + تبويب "إصلاحات" جديد
- Task 11: ESLint — 0 أخطاء

Files Created:
- prisma/seed.ts
- src/lib/store.ts
- src/app/api/issues/route.ts
- src/app/api/issues/[id]/route.ts
- src/app/api/ai-analysis/route.ts
- src/components/issues/AiAnalysisDialog.tsx
- src/components/dashboard/FixProgressCard.tsx
- src/components/dashboard/FixTimeline.tsx

Files Modified:
- prisma/schema.prisma
- package.json
- src/app/page.tsx
- src/components/issues/CriticalIssueCard.tsx
- src/components/issues/IssueRow.tsx
- worklog.md

Status: COMPLETED — All 10 tasks done, ESLint clean, page serves 200.