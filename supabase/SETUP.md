# Supabase setup for Labmate

Follow these steps once. The app code is already wired — you only need a Supabase project, env vars, and the database tables.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up / sign in.
2. **New project** → pick a name (e.g. `labmate`) and a database password (save it somewhere — you rarely need it for this app).
3. Wait for the project to finish provisioning (~1 minute).

## 2. Enable email auth

1. In the Supabase dashboard: **Authentication → Providers → Email**.
2. Ensure **Email** is enabled.
3. For development, you can disable **Confirm email** so sign-up works instantly without checking inbox.
   - Production: leave confirmation on for security.

## 2b. Enable Google sign-in (optional)

### A. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create or select a project.
2. **APIs & Services → OAuth consent screen** → configure (External is fine for a small app).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
4. Application type: **Web application**.
5. **Authorized JavaScript origins** — add:
   - `http://localhost:3000`
   - `https://your-production-domain.com`
6. **Authorized redirect URIs** — add your Supabase callback (from Supabase dashboard):
   - `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
   
   Find the exact URL in Supabase under **Authentication → Providers → Google** (shown as “Callback URL”).

7. Copy the **Client ID** and **Client Secret**.

### B. Supabase dashboard

1. **Authentication → Providers → Google** → enable.
2. Paste **Client ID** and **Client Secret** → Save.

Google sign-in uses the same app redirect URLs as email (step 3). No code changes needed beyond deploy.

## 3. Set redirect URLs

1. **Authentication → URL Configuration**
2. **Site URL:** `http://localhost:3000` (use your production URL when deployed)
3. **Redirect URLs** — add:
   - `http://localhost:3000/auth/callback`
   - `https://your-production-domain.com/auth/callback` (when you deploy)

## 4. Create database tables

1. **SQL → New query**
2. Paste the contents of [`schema.sql`](./schema.sql) in this folder
3. Click **Run**

This creates `user_workspaces` and `user_presets` with Row Level Security so each user only sees their own data.

## 5. Add environment variables

1. In Supabase: **Project Settings → API**
2. Copy **Project URL** and **anon public** key
3. In this repo, create or edit `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

4. Restart the dev server: `npm run dev`

## 6. Verify it works

1. Open [http://localhost:3000](http://localhost:3000)
2. Click the **sign-in icon** (bottom-right)
3. Create an account and sign in
4. Edit a protocol, refresh the page — your work should still be there
5. In Supabase **Table Editor → user_workspaces**, you should see one row for your user

## How saving works

| State | Where data is stored |
|-------|----------------------|
| Not signed in | Browser `localStorage` (survives refresh on same device/browser) |
| Signed in | Supabase cloud + local backup |
| First sign-in | Local workspace is uploaded if you had work before signing in |

Presets still use `localStorage` for now. Cloud preset sync uses the `user_presets` table (schema is ready; UI wiring is a follow-up).

## Deploying to production

1. Deploy the Next.js app (e.g. Vercel)
2. Add the same env vars in your host’s dashboard
3. Update Supabase **Site URL** and **Redirect URLs** to your production domain
4. Optional: upgrade Supabase to **Pro ($25/mo)** so the project never auto-pauses after inactivity

## Cost reminder (< 50 users)

- **Supabase Free:** $0 — fine for development; project pauses after ~7 days with no activity
- **Supabase Pro:** $25/month — always on, daily backups, good for a live app
- At your scale you will not hit auth or storage limits on either tier

## Troubleshooting

**“Supabase not configured” on login page**  
Env vars missing or dev server not restarted after adding them.

**Sign-up works but sign-in fails**  
Email confirmation may be required — check your inbox or disable confirm in Auth settings for dev.

**Save failed / Retry**  
Check browser console and Supabase **Logs**. Usually means `schema.sql` wasn’t run or RLS policies are missing.

**Data not syncing across devices**  
Make sure you’re signed in on both — unsigned-in data stays local to each browser.

**Google sign-in redirect error**  
Check that `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback` is in Google Cloud redirect URIs, and that both localhost + prod `/auth/callback` URLs are in Supabase redirect URLs.
