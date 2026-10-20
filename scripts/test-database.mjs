import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

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
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610200001_initial.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL("../supabase/tests/rls.sql", import.meta.url),
      "utf8",
    ),
  );
  console.log(
    "Database checks passed: migrations, status triggers, cross-user isolation, owner spoofing/transfer, read-only history, anonymous access, and cascading deletion.",
  );
} finally {
  await db.close();
}
