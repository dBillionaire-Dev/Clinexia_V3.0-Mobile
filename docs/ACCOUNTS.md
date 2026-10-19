# Accounts, plans, campaigns (mobile)

This app has no server of its own. Accounts, plans, payments, campaigns and feedback all live on the **Clinexia website's backend**
(the repo with the admin screens), so everything is shared: someone who signs up here shows up in the website's admin (Accounts management,
marked "Android app"), a plan the admin sets appears here, and campaigns the admin creates are shown here.

## Needed to work
1. The web repo must have the matching update (accounts + mobile access) applied and its SQL run.
2. This app must know the website's address: build with `NEXT_PUBLIC_ANALYTICS_URL` set to the same variable analytics already use.
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
