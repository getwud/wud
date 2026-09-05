import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    dialect: 'sqlite',
    schema: './store/db/schema.ts',
    out: './store/db/migrations',
});
