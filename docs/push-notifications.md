# Push notifications

Money Diary and DayMark share one React bundle but use separate PWA scopes:

| App | Identifier | Start URL | Scope | Service worker |
| --- | --- | --- | --- | --- |
| Money Diary | `money_diary` | `/money` | `/money` | `/money-diary-sw.js` |
| DayMark | `daymark` | `/daymark/today` | `/daymark` | `/daymark-sw.js` |

## 1. Database

Apply the migration:

```powershell
supabase db push
```

The migration creates:

- `push_subscriptions`
- `notification_jobs`
- `money_diary_notification_settings`
- `daymark_notification_settings`

All four tables have RLS. Subscription and job uniqueness includes
`app_identifier`, so one browser can subscribe independently to both apps.

## 2. VAPID keys

Generate one VAPID key pair for this deployment. The same pair is used to
encrypt Web Push, while subscriptions remain separated by app identifier and
service-worker scope.

Set the public key in local/Vercel build environments:

```text
VITE_VAPID_PUBLIC_KEY=<public VAPID key>
```

Set Edge Function secrets:

```powershell
supabase secrets set VAPID_PUBLIC_KEY="<public VAPID key>"
supabase secrets set VAPID_PRIVATE_KEY="<private VAPID key>"
supabase secrets set VAPID_SUBJECT="mailto:your-email@example.com"
supabase secrets set CRON_SECRET="<long random value>"
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically by
Supabase Edge Functions.

## 3. Deploy the dispatcher

```powershell
supabase functions deploy dispatch-notifications --no-verify-jwt
```

The function still requires `x-cron-secret`; disabling Supabase JWT
verification only allows the scheduler to reach that custom verification.

Create a Supabase Cron job that runs every minute and sends:

```http
POST https://<project-ref>.supabase.co/functions/v1/dispatch-notifications
x-cron-secret: <CRON_SECRET>
Content-Type: application/json
```

The dispatcher atomically claims pending jobs, sends only to subscriptions with
the same `app_identifier`, deactivates expired endpoints, and marks each job as
sent or failed.

The client keeps a 31-day rolling schedule for recurring daily reminders. Data
changes reschedule the affected jobs, so adding an entry, expense, task, or
changing a goal removes or replaces its stale pending jobs.

## 4. Client configuration

Set these variables before the production build:

```text
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_VAPID_PUBLIC_KEY=<public VAPID key>
```

After changing Vercel environment variables, trigger a new deployment. Vite
embeds `VITE_*` values at build time.

## 5. Browser test

1. Open `/money/settings`.
2. Select `Bật trên thiết bị này`.
3. Select `Gửi thông báo thử`.
4. Confirm the title/icon are Money Diary and clicking opens `/money`.
5. Open `/daymark/settings` and repeat.
6. Confirm DayMark uses its own title/icon and opens `/daymark`.

If an older build registered the generated `/sw.js`, the new client unregisters
that legacy worker before installing the two scoped workers. For a device that
still serves a stale build, remove the installed PWA once and clear the site's
storage before reinstalling.

## Platform notes

- Android Chromium supports Web Push, vibration, notification badge, and
  maskable icons.
- Desktop Chromium supports Web Push but may ignore vibration.
- iPhone/iPad requires iOS/iPadOS 16.4 or newer and the app must be installed
  on the Home Screen. Sound and vibration remain controlled by iOS.
- Browser permission is origin-wide. Actual push subscriptions are still
  separate because each app uses a different service-worker registration and
  `app_identifier`.
