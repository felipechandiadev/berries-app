import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { getDb } from '@/data/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Diagnóstico de conexión DB desde Vercel (mysql2 + TypeORM).
 * GET /api/health/db
 */
export async function GET() {
  const host =
    process.env.DB_HOST ||
    process.env.DATABASE_HOST ||
    'localhost';
  const port = Number(process.env.DB_PORT || process.env.DATABASE_PORT || 3306);
  const user =
    process.env.DB_USER ||
    process.env.DATABASE_USER ||
    process.env.DB_USERNAME ||
    'root';
  const password =
    process.env.DB_PASSWORD ||
    process.env.DATABASE_PASSWORD ||
    '';
  const database =
    process.env.DB_NAME ||
    process.env.DATABASE_NAME ||
    process.env.DB_DATABASE ||
    '';

  const configSummary = {
    host,
    port,
    user,
    database,
    hasPassword: Boolean(password),
    ssl: process.env.DB_SSL || 'unset',
    nextAuthUrl: process.env.NEXTAUTH_URL || 'unset',
    nodeEnv: process.env.NODE_ENV || 'unset',
  };

  const result: Record<string, unknown> = {
    ok: false,
    config: configSummary,
    mysql2: null,
    typeorm: null,
  };

  try {
    const conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 10000,
    });

    const [rows] = await conn.query(
      'SELECT DATABASE() AS db, USER() AS dbUser, VERSION() AS version, (SELECT COUNT(*) FROM users) AS userCount'
    );
    await conn.end();
    result.mysql2 = { ok: true, result: Array.isArray(rows) ? rows[0] : rows };
  } catch (error: any) {
    result.mysql2 = {
      ok: false,
      error: {
        code: error?.code || null,
        message: error?.message || String(error),
      },
    };
  }

  try {
    const db = await getDb();
    const userCount = await db.getRepository('User').count();
    const ping = await db.query('SELECT 1 AS ok');
    result.typeorm = { ok: true, userCount, ping };
  } catch (error: any) {
    result.typeorm = {
      ok: false,
      error: {
        code: error?.code || error?.driverError?.code || null,
        message: error?.message || String(error),
      },
    };
  }

  result.ok = Boolean(
    (result.mysql2 as any)?.ok && (result.typeorm as any)?.ok
  );

  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
