# Firebase — connected and verified

The project is **already set up and working**. This page records what was done,
and how to change things later.

| | |
| --- | --- |
| Project | `sai-brundavan-grand` |
| Database | Firestore Native, `asia-south1` (Mumbai) |
| Login | username `trilok` (stored as `trilok@saibrundavangrand.in`) |
| Your UID | `JSEWxAhY5cczxc14jqoB9VnViOr2` — role `owner` |
| Keys | `sales-app/.env` (git-ignored) |
| Rules | `sales-app/firestore.rules`, deployed |

The app turns the username `trilok` into `trilok@saibrundavangrand.in` before
sending it to Firebase, so staff only ever type `trilok`. That mapping is
`VITE_AUTH_EMAIL_DOMAIN` in `.env` and must match the account's email.

> The keys in `.env` are **not** secrets. A Firebase web config is visible in any
> browser by design. The security rules are what protect the data.

## What was verified against the live project

Sixteen checks, run against the real database:

- Signing in as `trilok` returns the expected UID; a wrong password is refused.
- The profile and hotel documents read correctly.
- A monthly target and a day of sales save, and read back with the right values.
- The rules **refuse**: a negative amount, a day whose id does not match its
  `date` field, a day filed under the wrong month, a negative target, a user
  trying to change their own role, and any access to a different hotel.
- A signed-out browser cannot read anything.
- A second device, signing in fresh, sees the same data.

All test data was deleted afterwards. The database now holds only
`users/JSEWxAhY5cczxc14jqoB9VnViOr2` and `hotels/sai-brundavan-grand`.

## Things worth doing

**Change the password.** The one this was set up with was agreed over chat, so
treat it as already known and replace it. Firebase Console → Authentication →
Users → ⋮ → Reset password. Nothing in the app needs changing, and no password
is stored in this repository.

**Set a budget alert** in the Google Cloud console. Usage sits far inside the
free tier — roughly 31 document reads per dashboard view — but an alert means
no surprises.

## Adding another person

1. Firebase Console → Authentication → **Add user**, e.g.
   `manager@saibrundavangrand.in` with a password. Copy the new UID.
2. Firestore → `users` collection → **Add document**, id = that UID, with:

   | Field | Type | Value |
   | --- | --- | --- |
   | `hotelId` | string | `sai-brundavan-grand` |
   | `role` | string | `owner`, `manager` or `staff` |
   | `name` | string | their name |

They then sign in with the part before the `@` as their username.

| Role | Can do |
| --- | --- |
| `owner` | everything, including deleting the hotel record |
| `manager` | add, edit and delete days; set monthly targets |
| `staff` | add and edit days only |

## Changing the rules

Edit `sales-app/firestore.rules`, then:

```bash
cd sales-app
npx firebase deploy --only firestore:rules --project sai-brundavan-grand
```

Or paste the file into Firebase Console → Firestore → Rules → Publish.

## Publishing a new version of the app

```bash
cd sales-app
npm install
npm run build      # writes the site into ../sales
```

Then commit and push; Netlify serves it at `/sales`.

## About offline

Firestore's IndexedDB persistence is deliberately **not** enabled. It was tried
and removed: if the page is navigated away from while Firestore is still
claiming the IndexedDB primary lease, the next load blocks forever inside
`updateClientMetadataAndTryBecomePrimary`, the dashboard sits on loading
skeletons, and **a reload does not fix it** — the stale lease is in IndexedDB, so
recovery needs site data cleared by hand. That is not something a hotel manager
can be asked to do.

What still works without it:

- Data already loaded stays readable for the session.
- A save made while offline is queued and sent when the connection returns,
  **as long as the app stays open**. The button keeps showing "Saving…" until it
  is confirmed, so a save is never silently reported as done when it is not.
- The header shows Synced / Saving / Offline at all times.

What is lost: reading past months while offline after fully closing and
reopening the app.

If the data cannot be reached at all, the dashboard says so after 15 seconds
with a retry button, rather than spinning forever.

## If something goes wrong

| What you see | What it means |
| --- | --- |
| "Incorrect username or password" | Wrong password, or `VITE_AUTH_EMAIL_DOMAIN` no longer matches the account's email. |
| "You do not have permission to do that" | That person has no `users/{uid}` document, or its `hotelId` is wrong. |
| "Saved on this device only" in Settings | `.env` is missing, or the app was not rebuilt after it changed. |
| "Could not reach the sales data" | No connection to Firestore. Tap retry. |

**Authorized domains** (Authentication → Settings) currently lists `localhost`
and the two Firebase domains. The Netlify domain is **not** listed and does not
need to be: that list only governs OAuth popup/redirect and email-link sign-in,
neither of which this app uses. Email and password sign-in works from any
origin.
