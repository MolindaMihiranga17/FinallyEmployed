import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";

// Real embedded PostgreSQL, with only the Supabase auth schema contract mocked.
const db = new PGlite();
try {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as
    $$ select (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  const migrations = new URL("../supabase/migrations/", import.meta.url);
  for (const name of (await readdir(migrations))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    await db.exec(await readFile(new URL(name, migrations), "utf8"));
  }
  await db.exec(
    await readFile(
      new URL("../supabase/tests/rls.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL("../supabase/tests/student-opportunities.sql", import.meta.url),
      "utf8",
    ),
  );
  console.log(
    "Database checks passed: migrations, status triggers, cross-user isolation, owner spoofing/transfer, read-only history, anonymous access, and cascading deletion.",
  );
} finally {
  await db.close();
}
