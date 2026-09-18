import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const connectionString =
	process.env.DATABASE_URL ||
	process.env.DRIZZLE_DB_URL;

if (!connectionString) {
	throw new Error(
		'Missing database connection string. Set DRIZZLE_DB_URL (preferred) or DATABASE_URL.'
	);
}

const sslRequired =
	connectionString.includes('sslmode=require') ||
	connectionString.includes('neon.tech');

const sql = postgres(connectionString, sslRequired ? { ssl: 'require' } : undefined);
export const db = drizzle(sql, { schema });
