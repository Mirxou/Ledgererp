/**
 * Regenerates src/lib/turso-schema.generated.ts from the current Prisma schema.
 *
 * Steps:
 *   bunx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > /tmp/diff.sql
 *   bun scripts/regen-turso-schema.ts /tmp/diff.sql
 */
import fs from "fs";

const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error("Usage: bun scripts/regen-turso-schema.ts <diff.sql>");
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, "utf8");

// Split into statements (Prisma --script output ends each with ";")
// Each chunk may be preceded by comment lines (-- CreateTable etc.) — strip them.
const raw = sql
  .split(";")
  .map((s) =>
    s
      .split("\n")
      .filter((line) => !line.trim().startsWith("--") && !line.trim().startsWith("/*"))
      .join("\n")
      .trim()
  )
  .filter((s) => s.length > 0);

// Parse table names in dependency-safe order (CREATE TABLE order is already safe)
const tableNames: string[] = [];
for (const stmt of raw) {
  const m = stmt.match(/CREATE TABLE (?:IF NOT EXISTS )?"(\w+)"/);
  if (m && !tableNames.includes(m[1])) tableNames.push(m[1]);
}

// Escape backticks and ${} for template literals
function tpl(s: string): string {
  return s.replace(/\\/g, "\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

const statementsTs = raw.map((s) => "  `" + tpl(s) + "`").join(",\n");
const namesTs = JSON.stringify(tableNames);

const out = `// AUTO-GENERATED from prisma/schema.prisma — do not edit by hand.
// Regenerate: bunx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
// then: bun scripts/regen-turso-schema.ts <diff.sql>
// Statements are idempotent (IF NOT EXISTS) so they are safe to run repeatedly on Turso/libSQL.

export const TURSO_SCHEMA_STATEMENTS: readonly string[] = [
${statementsTs},
];

// Table names in dependency-safe first order (for health checks / bootstrap validation)
export const TURSO_TABLE_NAMES: readonly string[] = ${namesTs};
`;

fs.writeFileSync("src/lib/turso-schema.generated.ts", out);
console.log("statements:", raw.length, "| tables:", tableNames.join(", "));
