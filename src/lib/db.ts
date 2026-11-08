import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaInit: Promise<PrismaClient> | undefined
}

async function createDb(): Promise<PrismaClient> {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const logSpec = process.env.NODE_ENV === 'development' ? ['query'] : ['error']

  // ── Serverless path (Vercel): Turso/libSQL cloud database ─────────────
  // SQLite keeps its schema and query syntax, but the file lives on Turso's
  // infrastructure via the official Prisma driver adapter.
  if (tursoUrl) {
    const { createClient } = await import('@libsql/client')
    const { PrismaLibSQL } = await import('@prisma/adapter-libsql')
    const { ensureTursoSchema, maybeBootstrapDemoData } = await import('./db-init')

    const authToken = process.env.TURSO_AUTH_TOKEN || undefined

    // Direct libSQL client — used for the idempotent DDL bootstrap
    const libsql = createClient({ url: tursoUrl, authToken })

    // Prisma driver adapter (6.x API): takes its own { url, authToken } config
    // and manages its internal connection pool
    const client = new PrismaClient({
      adapter: new PrismaLibSQL({ url: tursoUrl, authToken }),
      log: logSpec,
    })

    // Idempotent: creates all tables on the very first boot, no-op afterwards.
    await ensureTursoSchema(libsql)
    await maybeBootstrapDemoData(client)
    return client
  }

  // ── Local / Docker path: local SQLite file (behaviour unchanged) ──────
  return new PrismaClient({ log: logSpec })
}

function ensureInit(): Promise<PrismaClient> {
  if (!globalForPrisma.prismaInit) {
    globalForPrisma.prismaInit = createDb().then(function (client) {
      globalForPrisma.prisma = client
      return client
    })
  }
  return globalForPrisma.prismaInit
}

/**
 * Transparent lazy proxy over PrismaClient.
 *
 * Why: `db` must be exported synchronously (dozens of call sites do
 * `db.model.findUnique(...)`), but the Turso path needs async bootstrap
 * (schema ensure) before the first query is safe. The proxy awaits that
 * bootstrap transparently on every call.
 *
 * Supports: model delegates (db.user.findUnique), $queryRaw tagged templates,
 * $executeRaw, $transaction(fn), $disconnect, $queryRawUnsafe, ...
 */
function createLazyDb(): PrismaClient {
  const cache = new Map<string, unknown>()

  return new Proxy({} as unknown as PrismaClient, {
    get(_target, prop) {
      if (typeof prop !== 'string' || prop === 'then') return undefined

      if (!cache.has(prop)) {
        if (prop.startsWith('$')) {
          // $-methods (incl. $queryRaw used as a tagged template):
          // forward template strings + values after init resolves
          cache.set(
            prop,
            (...args: unknown[]) =>
              ensureInit().then((c) => (c as unknown as Record<string, (...a: unknown[]) => unknown>)[prop](...args))
          )
        } else {
          // Model delegate: db.<model>.<method>(...args)
          cache.set(
            prop,
            new Proxy({} as Record<string, (...args: unknown[]) => unknown>, {
              get(_mTarget, method) {
                if (typeof method !== 'string' || method === 'then') return undefined
                const key = prop + '.' + method
                if (!cache.has(key)) {
                  cache.set(
                    key,
                    (...args: unknown[]) =>
                      ensureInit().then((c) => {
                        const model = (c as unknown as Record<string, Record<string, (...a: unknown[]) => unknown>>)[prop]
                        return model[method](...args)
                      })
                  )
                }
                return cache.get(key)
              },
            })
          )
        }
      }
      return cache.get(prop)
    },
  })
}

export const isTursoEnabled = Boolean(process.env.TURSO_DATABASE_URL)

/**
 * Resolves once the database client is fully ready (Turso schema ensured).
 * Used by /api/health to report accurate status.
 */
export function whenDbReady(): Promise<PrismaClient> {
  if (!isTursoEnabled) {
    // Local path: client is ready synchronously
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
      })
    }
    return Promise.resolve(globalForPrisma.prisma)
  }
  return ensureInit()
}

export const db: PrismaClient = isTursoEnabled
  ? createLazyDb()
  : (globalForPrisma.prisma ??
    new PrismaClient({
      // Only log queries in development — disable in production for performance
      log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
    }))

if (process.env.NODE_ENV !== 'production' && !isTursoEnabled) globalForPrisma.prisma = db
