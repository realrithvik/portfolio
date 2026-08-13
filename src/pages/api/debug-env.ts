import type { APIRoute } from 'astro';

/**
 * TEMPORARY diagnostic — delete once Keystatic's GitHub mode is confirmed working.
 *
 * Distinguishes "the secrets were never applied" from "locals.runtime.env is not
 * populated at all", which produce an identical Keystatic error. Reports key NAMES
 * and booleans only; no value is ever read or returned.
 */
export const prerender = false;

export const GET: APIRoute = ({ locals }) => {
  const runtime = (locals as { runtime?: { env?: Record<string, unknown> } }).runtime;
  const env = runtime?.env;

  const body = {
    runtimePresent: Boolean(runtime),
    envPresent: Boolean(env),
    keyNames: env ? Object.keys(env).sort() : [],
    expected: {
      KEYSTATIC_GITHUB_CLIENT_ID: Boolean(env?.KEYSTATIC_GITHUB_CLIENT_ID),
      KEYSTATIC_GITHUB_CLIENT_SECRET: Boolean(env?.KEYSTATIC_GITHUB_CLIENT_SECRET),
      KEYSTATIC_SECRET: Boolean(env?.KEYSTATIC_SECRET),
    },
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};
