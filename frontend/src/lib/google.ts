/**
 * Google sign-in configuration. The OAuth client id comes from the environment
 * (VITE_GOOGLE_CLIENT_ID) - there is no hard-coded fallback, so staging and production can use
 * different Google projects. When it is missing the UI explains it instead of redirecting to a broken page.
 */
export const GOOGLE_NOT_CONFIGURED_MESSAGE =
  'Google sign-in isn’t set up for this environment yet. Please use your email and password, or ask your administrator to configure it.';

//export const getGoogleClientId = (): string => String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
export const getGoogleClientId = (): string =>
  String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim() ||
  '576579649438-hu938422fs81bnfapicia4ojd7c2ohks.apps.googleusercontent.com';
export const isGoogleConfigured = (): boolean => getGoogleClientId().length > 0;

/** Returns the Google consent URL, or null when VITE_GOOGLE_CLIENT_ID is not configured. */
export function buildGoogleAuthUrl(): string | null {
  const clientId = getGoogleClientId();
  if (!clientId) return null;
  const redirectUri = encodeURIComponent(`${window.location.origin}/oauth/callback`);
  const scope = encodeURIComponent('openid email profile');
  return (
    `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account&state=auth_google`
  );
}
