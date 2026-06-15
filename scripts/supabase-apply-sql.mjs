#!/usr/bin/env node
/**
 * Supabase CLI가 macOS에서 SIGKILL 될 때 SQL을 Management API로 적용합니다.
 * 사용: node scripts/supabase-apply-sql.mjs [sql파일경로]
 * 기본값: supabase/migrations/20260417130000_rpc_restore_session.sql
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRef =
  readFileSync(resolve('supabase/.temp/project-ref'), 'utf8').trim() ||
  'bdvygleavznqguemxisp';

const sqlPath = resolve(process.argv[2] ?? 'supabase/migrations/20260417130000_rpc_restore_session.sql');
const sql = readFileSync(sqlPath, 'utf8');

function readAccessToken() {
  let raw = '';
  try {
    raw = execSync('security find-generic-password -s "Supabase CLI" -w', {
      encoding: 'utf8',
    }).trim();
  } catch {
    console.error(
      'Supabase CLI 로그인 토큰을 찾지 못했습니다. 터미널에서 `npx supabase login` 후 다시 시도하세요.'
    );
    process.exit(1);
  }
  if (raw.startsWith('go-keyring-base64:')) {
    return Buffer.from(raw.slice('go-keyring-base64:'.length), 'base64').toString('utf8');
  }
  return raw;
}

const token = readAccessToken();
const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

const body = await res.text();
if (!res.ok) {
  console.error(`SQL 적용 실패 (${res.status}):`, body);
  process.exit(1);
}

console.log(`SQL 적용 완료: ${sqlPath}`);
if (body && body !== '[]') console.log(body);
