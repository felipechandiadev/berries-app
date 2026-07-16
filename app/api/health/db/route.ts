import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Diagnóstico de conexión DB desde Vercel (sin exponer password).
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

  try {
    const conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 10000,
      ssl:
        process.env.DB_SSL === 'true'
          ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
          : undefined,
    });

    const [rows] = await conn.query(
      'SELECT DATABASE() AS db, USER() AS dbUser, VERSION() AS version, (SELECT COUNT(*) FROM users) AS userCount'
    );
    await conn.end();

    return NextResponse.json({
      ok: true,
      config: configSummary,
      result: Array.isArray(rows) ? rows[0] : rows,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        config: configSummary,
        error: {
          code: error?.code || null,
          errno: error?.errno || null,
          sqlState: error?.sqlState || null,
          message: error?.message || String(error),
        },
      },
      { status: 503 }
    );
  }
}
