# Collaborative Studio Portfolio

A dark, responsive agency portfolio and administrator workspace for a three-person team. The project is a TypeScript monorepo: React/Vite client, Express REST API, and Supabase PostgreSQL/Auth/Storage. Public content and dashboard metrics are read from Supabase; the repository contains no fake users, seed projects, testimonial content, or analytics.

## What is included

- Public home, about, services, work gallery and detail pages, team profiles and detail pages, testimonials and moderation form, and contact page.
- Protected admin routes for overview, projects, services, up to three team profiles, testimonials, messages, visitor analytics, website settings, and account/password management.
- Supabase Auth email/password sign-in, secure operator-run admin account creation, server-side JWT and admin checks, and RLS.
- Validated Express endpoints for public content, contact submissions, testimonials, moderation, analytics, settings, and admin CRUD.
- Supabase Storage buckets and policies; admin image upload, preview, replacement, multi-image project galleries, and deletion. Images are limited to 5 MB and JPG, PNG, WebP, or AVIF.
- Contact messages are persisted before Gmail notification is attempted. Delivery outcome is recorded and administrators can retry failed notifications.
- Anonymous first-party page views use random browser/event UUIDs; visitor IDs are HMAC-pseudonymized on the server. No raw IP address or browser fingerprint is stored. Admin-authenticated browsing and admin routes are excluded.
- Loading, empty, error, and configuration states; responsive layouts; reduced-motion support; GSAP and Motion effects; Lenis smooth scrolling on public pages.

## Requirements

- Node.js 20+ and npm 10+
- A Supabase project
- Optional Google account with 2-Step Verification and a Google App Password for contact notifications

## Local setup

1. Install packages:

   ```powershell
   npm install
   ```

2. Copy `.env.example` to `.env` in the repository root. Add your Supabase project URL and **publishable** key to both client and server settings:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
   ```

   `SUPABASE_SECRET_KEY` is a server-only Supabase secret/service-role key used by administrator provisioning and by validated, rate-limited API submission RPCs. Never set it as a `VITE_` variable. Generate a separate long random analytics key, for example:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Put the result in `ANALYTICS_HASH_SECRET`. Keep it stable: changing it starts a new pseudonymous visitor-ID namespace.

3. Apply the SQL files in `supabase/migrations/` to your Supabase project in timestamp order (Supabase Dashboard → SQL Editor), or apply them using your existing Supabase CLI workflow. The initial migration creates the schema, RLS policies, server-validated submission RPCs, analytics RPCs, settings row, and four public image buckets. The follow-up migrations grant the profile privileges needed for admin setup and ensure signed-in users can read their own profile. `supabase/seed.sql` intentionally contains no invented studio content or credentials.

4. In Supabase Auth settings:
   - Enable email/password sign-in.
   - Disable public sign-up / anonymous account creation.
   - Set the local and production site URLs and password-reset redirect URLs (for local development, `http://localhost:5173/auth/reset-password`).
   - Configure Auth email delivery if you want password-reset emails to work. Admin account creation itself does not send email.

5. Create an administrator from an interactive terminal:

   ```powershell
   npm run create-admin
   ```

   Enter an email-shaped login such as `admin@studio.test`; it does not need to be a real Gmail address or receive email. Choose a separate website admin password—do not enter a Gmail password. Password input is masked and must be confirmed. The CLI creates the Supabase Auth user as email-confirmed, assigns the `admin` role, and sends no verification or invitation email. Public registration remains disabled. Run the command again for each additional administrator.

   If the entered email already has a Supabase Auth user (for example, from an earlier setup attempt), the script asks before changing that account's password and granting it admin access. A fake/test address cannot receive password-reset emails; rerun this CLI to set a new password instead.

   The CLI checks that `VITE_SUPABASE_URL` and `SUPABASE_URL` point to the same project. The browser signs in through the former while the CLI creates the user and admin profile in the latter.

   If account creation reports `permission denied for table profiles` (PostgreSQL code `42501`) or the dashboard still says the user has no administrator profile, apply `supabase/migrations/202611230002_grant_admin_profile_provisioning.sql` and `supabase/migrations/202611230003_repair_admin_profile_access.sql` in the Supabase SQL Editor. Then run `npm run create-admin` again with the same login email, confirm the existing-user update, and set the password you want. The repair migration does not grant admin access to every Auth account.

6. Optional Gmail notifications: set `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and `NOTIFICATION_EMAIL`. Use a Google-generated App Password (not the Google account password). The integration uses `smtp.gmail.com:465` with TLS. Contact messages still save if mail configuration or delivery fails.

7. Start the client and API:

   ```powershell
   npm run dev
   ```

   The site is at `http://localhost:5173`; the API health/configuration endpoint is `http://localhost:4000/api/health`. The API intentionally starts without credentials and reports missing integrations rather than returning demo data. Supabase-backed pages and sign-in become available when environment values and the migration are configured.

   If opening the site through a LAN address such as `http://10.0.0.5:5173`, add that exact origin to `CLIENT_ORIGIN` as a comma-separated entry. Leave `VITE_API_URL` empty to have the browser connect to port `4000` on the same hostname as the site, or set it to the API's reachable URL. Restart both the API and Vite after changing `.env`.

8. Sign in at `http://localhost:5173/login` with the email and password you chose. Add the real team profiles and link each profile to its corresponding Auth user UUID when available. Create actual projects, services, website settings, and contact details from the dashboard; public pages remain empty until content is published.

## Environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Browser | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser | Public Supabase key; RLS remains authoritative |
| `VITE_API_URL` | Browser | API base URL; when empty, uses port `4000` on the current site hostname |
| `SUPABASE_URL` | Server | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Server | User-scoped/public Supabase operations |
| `SUPABASE_SECRET_KEY` | Server/admin CLI only | Secure Auth admin account creation/profile provisioning and API-only public submissions; never exposed in browser |
| `PORT` | Server | API port, defaults to `4000` |
| `CLIENT_ORIGIN` | Server | Comma-separated allowed browser origins, defaults to `http://localhost:5173` |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `NOTIFICATION_EMAIL` | Server | Optional SMTP contact notifications |
| `ANALYTICS_HASH_SECRET` | Server | HMAC key for pseudonymizing anonymous browser IDs |

The root `.env` is loaded by Vite and the API. For production, configure these values through the hosting platform's secret/environment-variable management; deploy the client and API with the appropriate production `VITE_API_URL` and `CLIENT_ORIGIN`.

## Database and access model

- Every application table has RLS enabled. Public roles can read only public content; contact messages, activity logs, and raw visitor-event rows are not publicly readable.
- Public contact/testimonial submission and analytics writes go through bounded, validated database functions invoked by rate-limited API endpoints using the server-only secret key. Direct public table writes and RPC execution are revoked.
- Project/service/team administration uses the signed-in Supabase user's JWT, so database RLS is evaluated as that administrator. The server verifies the JWT with Supabase Auth and checks the administrator profile on every protected request. The browser never supplies a trusted role.
- Administrator profiles are created only by the server-side account setup CLI and cannot be deleted or role-edited through the client. All administrators receive the same role.
- Public testimonial responses omit email addresses. Public team reads omit the linked Auth user ID.
- Image buckets are public for rendering. Upload and deletion require an authenticated admin policy; MIME type, file extension, bucket type, and maximum size are constrained.

## Analytics and privacy

The browser stores a random first-party ID in local storage and sends a distinct UUID for each page-view event. The API HMAC-hashes the visitor ID before storage, rejects malformed/admin paths and basic bots, and records only event ID, pseudonymous visitor hash, path, and timestamp. Duplicate event IDs are ignored by a database uniqueness constraint. Raw IP addresses, fingerprints, and user-agent values are not persisted. Reporting date boundaries use `Asia/Manila`. “Unique visitors” means an estimate of distinct browsers, not confirmed individual people. The contact page displays this notice to visitors.

## Commands and validation

```powershell
npm run typecheck
npm run build
npm run create-admin
```

`npm run build` creates `server/dist` and `client/dist`. The API health endpoint is useful for deployment probes. Build/type checks do not test an external Supabase project or Gmail SMTP: those integrations require real project configuration and credentials.

## Honest implementation notes

- The application has not been connected to a live Supabase project or Gmail account in this workspace; external authentication, SQL execution, file upload, analytics writes, account provisioning, and email delivery therefore remain unverified until configured.
- The SQL migrations must be applied to a new Supabase project. Verify the migration and manual account creation flow in a non-production project before creating production administrators.
- No personal/team/client content is fabricated. Add the three real team members and actual portfolio content through the admin workspace after provisioning.
- The deployment host must serve the Vite SPA with history fallback and run the Express API separately. Configure HTTPS, production CORS origin, backups, SMTP, Auth redirect URLs, and secret rotation for a real deployment.
