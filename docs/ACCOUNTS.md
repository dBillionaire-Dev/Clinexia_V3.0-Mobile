# Accounts, plans, campaigns (mobile)

This app has no server of its own. Accounts, plans, payments, campaigns and feedback all live on the **Clinexia website's backend**
(the repo with the admin screens), so everything is shared: someone who signs up here shows up in the website's admin (Accounts management,
marked "Android app"), a plan the admin sets appears here, and campaigns the admin creates are shown here.

## Needed to work
1. The web repo must have the matching update (accounts + mobile access) applied and its SQL run.
2. This app must know the website's address: build with `NEXT_PUBLIC_ANALYTICS_URL=https://www.clinexia.app` (the same variable analytics already use).
   Without it the profile icon and account screens stay hidden and nothing changes.
3. Premium locking is switched on or off **on the website** (`BILLING_ENFORCE_PREMIUM`). The app follows it. While it is off nothing is locked,
   no guest limit applies and no Free/Premium badges show.

## What is in the app
- Profile icon in the header: signed out = Sign in / Create account; signed in = My account / Sign out. A red "!" shows when a review form is parked.
- `/register` -> "Check your email" (10 seconds) -> `/login` -> Home (or the page they were heading to). `/account` opens from the menu or from a locked tool.
- Plans: pick specialties or all-access; the price is computed by the server (Nigeria in ₦, elsewhere in $, set by the admin). Payment opens Paystack in the
  phone's browser; coming back to the app confirms it automatically ("I have paid, check now" also works).
- Organisations: create one, invite staff (private links you copy and send), assign specialties, seats, cancel.
- Premium lock on specialty tools; Free / Premium badges on tool lists and tool pages. The decision uses what the phone last learned from the server,
  so it works offline and without a flash.
- Guests: 3 calculations per phone, then browse-only (links work; anything else asks them to create an account). Clearing the app's data resets it.
- Campaigns (admin > Campaigns on the website): notices and review forms as a sheet, a bar under the header or a small alert. "Remind me later" shrinks the
  card into the profile icon; the menu then offers "Complete feedback form".
- Feedback reminders: people who answered are not asked again (the server remembers per device and round); "Later" returns after the wait; a new round re-opens it.
- Themed confirm / prompt dialogs (`components/app-dialogs.tsx`) instead of the browser's.

## How the app signs in
`POST /api/account/login` returns the tokens (no cookies); the app stores them on the phone and sends `Authorization: Bearer <token>`; `/api/account/refresh` renews them.
Inside the Android app, requests use the phone's own network client (no browser rules). On the mobile website the website's server allows this site's address
(`https://clinexia-mobile.vercel.app`; others via `MOBILE_ALLOWED_ORIGINS` on the web repo).

## Limits
- The lock is a front-end lock: calculations still run on the phone.
- Email confirmation links open the website (set Supabase's Site URL / Redirect URLs as described in the web repo's docs/billing.md); after confirming, come back and sign in.
- Organisation invitation emails are not sent; copy the links from the organisation screen.

## Signing in: use the website's full address
Build the app with `NEXT_PUBLIC_ANALYTICS_URL=https://www.clinexia.app`. The address without `www` redirects, and a sign-in (a POST) cannot follow that redirect reliably.
The app now follows one redirect itself and says so if it still cannot, but the canonical address is the safe one. Set it in the GitHub release workflow and in `.env.local` for local runs.
Testing the app in a browser from your computer against the live website: ask the website admin to add your origin (for example `http://localhost:3000`) to the website's
`MOBILE_ALLOWED_ORIGINS`; the Android build itself is not affected by browser rules.

## Where a campaign shows, and following the account
- Each campaign has "Where it shows" (Website / Android app / Mobile website), set in the website's admin. The app only shows campaigns meant for it.
- A form answered while signed in is not asked again on any device (website or phone); "Remind me later" also follows the account, so a form parked on the website
  waits in the profile icon here. Guests have no account, so the 3-calculation guest limit and parked items stay on this phone.
- The app looks for new campaigns when you return to it after about 10 minutes, so a newly published one appears without a restart.

## Phone notifications (even when the app is closed)
1. Website side: run `supabase/push.sql` and set `FCM_SERVICE_ACCOUNT_JSON` (see the website's docs/billing.md).
2. Put the Firebase `google-services.json` in `android/app/` (Firebase console > your Android app, using the `appId` from `capacitor.config.ts`).
3. `pnpm add @capacitor/push-notifications` then `npx cap sync android`, and make a new release build.
4. In the app: Account > Notifications > Turn on notifications (Android asks for permission). Admin sends from the website: Campaigns > Phone notifications.
Until step 3 is done the app simply shows no notifications section and nothing else changes.

## Linking this phone to the account (admin sees the real name and history)
When someone registers or signs in here, the app sends this phone's anonymous ID along, and the website links it to the account (also once after signing in, for accounts
made earlier). In the website's admin the device then shows the person's registered name instead of "User-XXXXXX" (a name an admin typed by hand is kept), and Accounts
management > Details lists the linked devices and the full calculation history, including everything done before registering. Nothing is linked if analytics is switched
off in Settings, and nothing about a person is linked until they register or sign in.
