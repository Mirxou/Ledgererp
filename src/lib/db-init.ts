import type { PrismaClient } from '@prisma/client'
import type { Client } from '@libsql/client'
import { TURSO_SCHEMA_STATEMENTS } from './turso-schema.generated'

/**
 * Turso/libSQL bootstrap helpers — used on Vercel (serverless) where there is
 * no writable filesystem for a local SQLite file.
 *
 * ensureTursoSchema(): applies the full Prisma schema idempotently.
 *   Every statement uses IF NOT EXISTS, so concurrent cold starts are safe.
 * maybeBootstrapDemoData(): seeds a minimal demo dataset the first time the
 *   app boots with an empty database and NEXT_PUBLIC_DEMO_MODE=true.
 */

export const DEMO_UID = 'demo_user_pi_uid'

export async function ensureTursoSchema(libsql: Client): Promise<{ created: boolean }> {
  // NOTE: We no longer early-return when "Store" exists. All statements are
  // IF NOT EXISTS (idempotent), so re-running them on every cold start is safe
  // AND required — otherwise NEW tables added in later releases would never be
  // created on databases bootstrapped by older versions. 18 statements cost
  // only ~50ms per cold start against Turso.
  const res = await libsql.execute(
    "SELECT count(*) AS c FROM sqlite_master WHERE type = 'table' AND name = 'Store'"
  )
  const alreadyExists = Number(res.rows[0]?.c ?? 0) > 0

  // Apply all DDL (CREATE TABLE / INDEX ... IF NOT EXISTS).
  // Each statement is isolated: one failure (e.g. a race on a busy database)
  // must never break the whole boot — log and continue.
  let failures = 0
  for (const stmt of TURSO_SCHEMA_STATEMENTS) {
    try {
      await libsql.execute(stmt)
    } catch (err) {
      failures++
      console.error('[turso-schema] statement failed:', String(err).slice(0, 200))
    }
  }
  if (failures > 0) console.warn(`[turso-schema] completed with ${failures} failed statements`)
  return { created: !alreadyExists }
}

/**
 * Minimal demo dataset so a fresh deployment is instantly usable.
 * Only runs when NEXT_PUBLIC_DEMO_MODE === 'true' AND the database is empty.
 * (The full 650-line seed remains available via `bun run db:seed` locally.)
 */
export async function maybeBootstrapDemoData(db: PrismaClient): Promise<boolean> {
  // Same condition as DEMO_MODE in constants.ts: explicit env flag OR local development
  const demoMode =
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.NODE_ENV === 'development'
  if (!demoMode) return false

  const storeCount = await db.store.count()
  if (storeCount > 0) return false

  await db.user.upsert({
    where: { piUid: DEMO_UID },
    update: {},
    create: {
      piUid: DEMO_UID,
      username: 'demo_user',
      language: 'ar',
      role: 'merchant',
      kycVerified: true,
    },
  })

  const store = await db.store.upsert({
    where: { piUid: DEMO_UID },
    update: {},
    create: {
      piUid: DEMO_UID,
      name: 'متجر الأمانة للتجارة',
      description: 'متجر إلكتروني للجملة والتجزئة على شبكة Pi — نقبل الدفع بـ Pi',
      slug: 'amana-store',
      currency: 'Pi',
      taxRate: 15,
      isVerified: true,
      address: 'الجزائر',
    },
  })

  const productCount = await db.product.count({ where: { storeId: store.id } })
  if (productCount === 0) {
    // 1 Pi = 10_000_000 microPi
    await db.product.createMany({
      data: [
        {
          storeId: store.id,
          name: 'زيت الزيتون البكر الممتاز 1 لتر',
          description: 'زيت زيتون طبيعي 100% — عبوطة زجاجية',
          price: 125_000_000, // 12.5 Pi
          costPrice: 90_000_000, // 9 Pi
          stockQuantity: 50,
          unit: 'زجاجة',
          sku: 'OLV-001',
        },
        {
          storeId: store.id,
          name: 'شامبو الأعشاب الطبيعية 500 مل',
          description: 'شامبو للعناية بالشعر بمكونات طبيعية',
          price: 80_000_000, // 8 Pi
          costPrice: 52_000_000, // 5.2 Pi
          stockQuantity: 120,
          unit: 'قطعة',
          sku: 'SHM-001',
        },
        {
          storeId: store.id,
          name: 'كريم العناية بالبشرة 200 مل',
          description: 'كريم مرطب للوجه واليدين',
          price: 255_000_000, // 25.5 Pi
          costPrice: 175_000_000, // 17.5 Pi
          stockQuantity: 35,
          unit: 'قطعة',
          sku: 'CRM-001',
        },
      ],
    })
  }

  return true
}
