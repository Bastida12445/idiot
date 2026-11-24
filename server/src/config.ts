import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

const optional = (name: string) => process.env[name]?.trim() || '';
const configuredPort = optional('PORT');
const port = configuredPort ? Number(configuredPort) : 4000;
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');

const requestedOrigins = (optional('CLIENT_ORIGIN') || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());
const origins = new Set<string>();
try {
  for (const requestedOrigin of requestedOrigins) {
    if (!requestedOrigin) throw new Error();
    const parsed = new URL(requestedOrigin);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error();
    origins.add(parsed.origin);
  }
} catch {
  throw new Error('CLIENT_ORIGIN must be a comma-separated list of HTTP(S) origins without paths, queries, or fragments.');
}

const supabaseUrl = optional('SUPABASE_URL');
if (supabaseUrl) {
  try {
    if (!['http:', 'https:'].includes(new URL(supabaseUrl).protocol)) throw new Error();
  } catch {
    throw new Error('SUPABASE_URL must be a valid HTTP(S) URL.');
  }
}

export const config = {
  port,
  origins: [...origins],
  supabaseUrl,
  supabaseKey: optional('SUPABASE_PUBLISHABLE_KEY'),
  supabaseSecret: optional('SUPABASE_SECRET_KEY'),
  analyticsSecret: optional('ANALYTICS_HASH_SECRET'),
  gmailUser: optional('GMAIL_USER'),
  gmailPassword: optional('GMAIL_APP_PASSWORD'),
  notificationEmail: optional('NOTIFICATION_EMAIL'),
};

export const supabaseConfigured = Boolean(config.supabaseUrl && config.supabaseKey);
export const storageAdminConfigured = Boolean(config.supabaseUrl && config.supabaseSecret);
export const mailConfigured = Boolean(config.gmailUser && config.gmailPassword && config.notificationEmail);
export const analyticsConfigured = config.analyticsSecret.length >= 32;

export const integrationStatus = () => ({
  database: supabaseConfigured ? 'configured' : 'missing_supabase_environment',
  storageManagement: supabaseConfigured ? 'configured' : 'missing_supabase_environment',
  serverSubmissions: storageAdminConfigured ? 'configured' : 'missing_supabase_secret_key',
  emailNotifications: mailConfigured ? 'configured' : 'missing_gmail_environment',
  analytics: analyticsConfigured ? 'configured' : config.analyticsSecret ? 'analytics_hash_secret_too_short' : 'missing_analytics_hash_secret',
});
