const REQUIRED_KEYS = [
  'OPENROUTER_API_KEY',
  'NEYNAR_API_KEY',
  'NEYNAR_BOT_UUID',
  'NEXT_PUBLIC_APP_URL',
  'PRIVY_APP_ID',
  'BOT_USERNAME'
] as const;

export function checkEnv() {
  const missing = REQUIRED_KEYS.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.warn(`[stream-alpha] Missing required env vars: ${missing.join(', ')}`);
  }
}
