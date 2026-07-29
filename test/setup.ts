// Point tests at a disposable SQLite file so we never touch the dev/demo
// database. The `pretest` npm script runs `prisma db push` against this URL
// before vitest starts, so the schema is already in sync when tests run.
process.env.DATABASE_URL = "file:./test/test.db";
