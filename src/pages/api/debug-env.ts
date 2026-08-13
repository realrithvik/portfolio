import type { APIRoute } from 'astro';

/**
 * TEMPORARY diagnostic — delete once Keystatic's GitHub mode is confirmed working.
 *
 * Keystatic reports every OAuth failure as a flat "Authorization failed", which hides
 * whether the credentials are wrong or the code was. This asks GitHub directly, using
 * a deliberately invalid code:
 *
 *   bad_verification_code        -> client id + secret are a VALID PAIR; look elsewhere
 *   incorrect_client_credentials -> the secret does not belong to that client id
 *
 * Reports key names, booleans, a masked client id, and GitHub's error string only.
 * No secret value is ever returned.
 */
export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const runtime = (locals as { runtime?: { env?: Record<string, unknown> } }).runtime;
  const env = runtime?.env;

  const clientId = env?.KEYSTATIC_GITHUB_CLIENT_ID as string | undefined;
  const clientSecret = env?.KEYSTATIC_GITHUB_CLIENT_SECRET as string | undefined;

  let credentialCheck: unknown = 'skipped — client id or secret missing';

  if (clientId && clientSecret) {
    try {
      const res = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: 'deliberately-invalid-probe',
        }),
      });
      const data = (await res.json()) as { error?: string; error_description?: string };
      credentialCheck = {
        githubError: data.error ?? '(none — unexpected)',
        meaning:
          data.error === 'bad_verification_code'
            ? 'Credentials are a valid pair. The failure is elsewhere.'
            : data.error === 'incorrect_client_credentials'
              ? 'Secret does not match this client id.'
              : data.error_description ?? 'Unrecognised response.',
      };
    } catch (err) {
      credentialCheck = { fetchFailed: String(err) };
    }
  }

  const body = {
    runtimePresent: Boolean(runtime),
    keyNames: env ? Object.keys(env).sort() : [],
    expected: {
      KEYSTATIC_GITHUB_CLIENT_ID: Boolean(clientId),
      KEYSTATIC_GITHUB_CLIENT_SECRET: Boolean(clientSecret),
      KEYSTATIC_SECRET: Boolean(env?.KEYSTATIC_SECRET),
    },
    clientIdMasked: clientId
      ? `${clientId.slice(0, 7)}…${clientId.slice(-4)} (len ${clientId.length})`
      : null,
    clientSecretLength: clientSecret ? clientSecret.length : null,
    credentialCheck,
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};
