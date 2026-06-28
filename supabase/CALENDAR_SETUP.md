# Google Calendar sync setup

LabMate calendar sync uses a **separate Google OAuth client** from Supabase login. Follow these steps once per environment.

## 1. Enable Google Calendar API

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project (or create one).
3. Go to **APIs & Services → Library**.
4. Search for **Google Calendar API** and enable it.

## 2. OAuth consent screen

1. **APIs & Services → OAuth consent screen**.
2. Configure the app (External is fine for development).
3. Add scope: `https://www.googleapis.com/auth/calendar`.

Production may require Google verification for sensitive scopes.

## 3. OAuth credentials

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized redirect URIs** — add:
   - `http://localhost:3000/api/calendar/callback`
   - `https://your-production-domain.com/api/calendar/callback`
4. Copy **Client ID** and **Client Secret** into `.env.local`:

```bash
GOOGLE_CALENDAR_CLIENT_ID=...
GOOGLE_CALENDAR_CLIENT_SECRET=...
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/calendar/callback
```

## 4. Token encryption key

Generate a 32-byte key:

```bash
openssl rand -base64 32
```

Set in `.env.local`:

```bash
CALENDAR_TOKEN_ENCRYPTION_KEY=...
```

## 5. Supabase service role

From Supabase dashboard → **Settings → API**, copy the **service role** key:

```bash
SUPABASE_SERVICE_ROLE_KEY=...
```

Never expose this key to the client.

## 6. Database tables

Run the calendar sync section of [`schema.sql`](./schema.sql) in the Supabase SQL editor.

Creates:

- `calendar_connections`
- `calendar_event_mappings`
- `calendar_series_sync`
- `calendar_push_queue`

## 7. Test users (development)

While the OAuth app is unverified, add test users under **OAuth consent screen → Test users**.

## Flow summary

1. User connects Google Calendar (OAuth stores refresh token; `calendar_id` remains null).
2. User publishes a series (creates LabMate secondary calendar + events).
3. Subsequent edits are pushed explicitly from the sync badge.

ICS download remains available as a backup export.
