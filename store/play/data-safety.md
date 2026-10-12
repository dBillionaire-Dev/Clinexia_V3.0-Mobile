# Google Play: Data safety form answers

Answer the form to match what the app really does. This is guidance based on the code, not legal advice. Re-check it if the app changes.

**Does your app collect or share any of the required user data types?** Yes (anonymous usage statistics).

| Question | Answer |
|---|---|
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS) |
| Do you provide a way for users to request that their data is deleted? | **Yes**: users can contact the developer (privacy policy), and can turn sharing off in Settings |

## Data types

| Category | Type | Collected? | Shared? | Optional? | Purpose |
|---|---|---|---|---|---|
| App activity | App interactions (which calculator or converter was used, and when) | **Yes** | No | **Yes** (Settings → Share anonymous usage statistics) | Analytics |
| Device or other IDs | Device or other IDs (a random installation ID created by the app. It is **not** the advertising ID or a hardware ID) | **Yes** | No | **Yes** (same switch) | Analytics |
| App info and performance | App version | **Yes** | No | **Yes** (same switch) | Analytics |

Everything else: **No**. In particular: no personal info (name, email, phone), no health info, no financial info, no location, no contacts, no photos or files, no messages, no web history, no advertising ID, and none of the values typed into calculators or their results.

"Shared" means transferred to a third party. Data processed on the developer's behalf by hosting providers (Vercel, Supabase) is **not** "sharing" under Google's definition. Say so only if you confirm it applies to your set-up.

## Other declarations
- **Ads:** No.
- **Data used for tracking / advertising:** No.
- **Privacy policy:** the `/privacy` page of your web app.
