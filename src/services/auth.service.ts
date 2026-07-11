import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { getConfig } from './config.service.js';
import { loadOAuthTokens, saveOAuthTokens } from './oauth.service.js';

// Patch: google-gax 5.x expects getRequestHeaders() result to have .forEach().
// google-auth-library returns a plain Record<string, string> that lacks .forEach().
// We attach a non-enumerable .forEach() to the plain object so callers using
// index-access AND .forEach() both work without type issues.
const originalGetRequestHeaders = OAuth2Client.prototype.getRequestHeaders;
OAuth2Client.prototype.getRequestHeaders = async function (
  this: OAuth2Client,
  url?: string,
) {
  const headers = await originalGetRequestHeaders.call(this, url);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = headers as any;
  wrapped.forEach = function (callback: (value: string, key: string) => void) {
    for (const k of Object.keys(wrapped)) callback(wrapped[k], k);
  };
  return wrapped;
};

export const GA4_SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/analytics.edit',
];

export function resolveCredentialsPath(): string | undefined {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
  const config = getConfig();
  if (config.credentials) {
    return config.credentials;
  }
  return undefined;
}

let cachedAuthOptions: { authClient: OAuth2Client } | { auth: GoogleAuth } | null = null;

export function getAuthClientOptions(): { authClient: OAuth2Client } | { auth: GoogleAuth } {
  if (cachedAuthOptions) return cachedAuthOptions;

  const tokens = loadOAuthTokens();
  if (tokens) {
    const oauth2Client = new OAuth2Client({
      clientId: tokens.client_id,
      clientSecret: tokens.client_secret,
    });
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      token_type: tokens.token_type,
    });
    oauth2Client.on('tokens', (newTokens) => {
      saveOAuthTokens({
        access_token: newTokens.access_token ?? tokens.access_token,
        refresh_token: newTokens.refresh_token ?? tokens.refresh_token,
        expiry_date: newTokens.expiry_date ?? tokens.expiry_date,
        token_type: newTokens.token_type ?? tokens.token_type,
        scope: newTokens.scope ?? tokens.scope,
        client_id: tokens.client_id,
        client_secret: tokens.client_secret,
      });
    });
    cachedAuthOptions = { authClient: oauth2Client };
    return cachedAuthOptions;
  }

  const keyFile = resolveCredentialsPath();
  if (!keyFile) {
    throw new Error(
      'No credentials configured. Run `gacli auth login` for OAuth or set a service account via:\n' +
        '  gacli config set credentials /path/to/service-account.json',
    );
  }
  const auth = new GoogleAuth({ keyFile, scopes: GA4_SCOPES });
  cachedAuthOptions = { auth };
  return cachedAuthOptions;
}

export function getActiveAuthMode(): 'oauth' | 'service-account' {
  const tokens = loadOAuthTokens();
  return tokens ? 'oauth' : 'service-account';
}

export function resetAuth(): void {
  cachedAuthOptions = null;
}
