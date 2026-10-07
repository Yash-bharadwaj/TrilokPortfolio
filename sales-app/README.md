# Sai Brundavan Grand — Sales

A mobile-first daily sales tool for Sai Brundavan Grand, Siddipet. It replaces
the handwritten sheet: the manager enters the day's figures on a phone, and the
owner receives a branded report image on WhatsApp.

Served at **`/sales`** on the existing portfolio site.

```bash
npm install
npm run dev        # http://localhost:5173/sales/
npm run build      # writes the production site into ../sales
npm test           # calculation engine tests
```

Firebase is **connected and verified** — project `sai-brundavan-grand`, Firestore
in `asia-south1`, login `trilok`. See **[FIREBASE-SETUP.md](./FIREBASE-SETUP.md)**
for what was set up, how to add staff, and the offline trade-off.

Credentials live in `sales-app/.env`, which is git-ignored. Copy `.env.example`
if you need to recreate it.

---

## The one business rule worth knowing

The handwritten sheet's `Net Sale | Swiggy | Zomato | Total Sale` columns do not
say on their own whether the total includes the aggregators, and the written
brief argued both ways. The hotel settled it:

- `total  = netSales + swiggy + zomato`
- `direct = netSales` — the restaurant's own dine-in and takeaway trade

The brief's History example corroborates it: it lists 3 October as ₹65,876 and
4 October as ₹59,247, which are exactly `net + swiggy + zomato` for those days.
(Its channel-split example elsewhere implies the opposite, so the sheet's
"Total Sale" column was not consistent. Nothing here depends on it.)

This lives in exactly one place, [`src/calculations/config.ts`](./src/calculations/config.ts).
Flipping `SALES_MODEL` swaps the rule, the wording and the column headings
together; nothing else changes.

## How figures are entered

The hotel keeps its sheet as a **running month-to-date total**: each line is
everything up to and including that day. The app takes them the same way.

**What is stored is exactly what was typed.** Daily figures are derived on read
by subtracting each line from the one before
([`calculations/entry-mode.ts`](./src/calculations/entry-mode.ts)), so the sheet
stays the source of truth. That is what makes a late correction safe — fill in a
day that was missed, and every day after it re-derives correctly. Converting to
daily at save time could not do that, because the typed line would be gone.

Totals reset each month, so months are differenced independently. A line lower
than the one before cannot occur in a genuine running total, so the day is
floored at zero and the entry form questions it.

`ENTRY_MODE` in [`calculations/config.ts`](./src/calculations/config.ts) switches
the whole app — the labels, the hint text, the derivation and the warning — to
plain daily entry instead.

## The calculations

All of it is in [`src/calculations/`](./src/calculations/), never inline in a
component, and covered by 31 tests (`npm test`).

| Figure                | Formula                                             |
| --------------------- | --------------------------------------------------- |
| Daily target          | `monthlyTarget ÷ days in that month`                |
| Expected by today     | `dailyTarget × days elapsed`                        |
| Ahead / behind        | `MTD sales − expected by today`, ±2% is "on track"  |
| Remaining             | `max(0, monthlyTarget − MTD sales)`                 |
| Needed per day        | `remaining ÷ days remaining`                        |
| Average per day       | `MTD sales ÷ days **recorded**`                     |
| Projected month-end   | `average per day × days in month`                   |
| vs last month         | previous month trimmed to the same days elapsed     |
| Weekday pattern       | each weekday averaged over its own recorded days    |

Four deliberate choices:

- **The average divides by days recorded, not calendar days.** A missing day is
  unrecorded, which is not the same as a day with zero sales.
- **Month length is always real.** 30, 31, 28, and 29 in a leap year — all tested.
- **A zero target yields `null`, never `Infinity`.** The UI shows "—".
- **A finished month reads as a result, not a pace.** "Target Missed", not
  "you need ₹X per day" for days that no longer exist.

### Historical reports

`calculateMonthlyMetrics(month, entries, target, asOf)` cuts the month at `asOf`
**inside the calculation layer**. A report dated 3 October therefore cannot
contain 4 October's sales no matter what the UI does. Two tests pin this.

## Structure

```
src/
  calculations/   the whole business engine + its tests
  components/ui/  shadcn/ui primitives (Radix + CVA)
  components/     dashboard cards, charts, report canvas
  pages/          login, dashboard, add sales, history, settings
  providers/      auth and sales data (React context)
  services/       repositories: Firestore and on-device, one interface
  schemas/        Zod schemas + the soft-warning rules
  lib/            dates, ₹ formatting, chart palette, image capture
```

### Data

```
hotels/{hotelId}/months/{YYYY-MM}              → { monthlyTarget }
hotels/{hotelId}/months/{YYYY-MM}/sales/{YYYY-MM-DD}
users/{uid}                                    → { hotelId, role }
```

Keying a sales document by its date makes duplicates impossible and keeps a
month to at most 31 documents, so the dashboard reads one small collection
instead of scanning history. Derived values are never stored — they are
recomputed, so a corrected entry cannot leave a stale total behind.

[`firestore.rules`](./firestore.rules) restricts every path to a signed-in user
whose `users/{uid}.hotelId` matches, with `owner` / `manager` / `staff` roles,
and validates amounts server-side as well as in the form.

## Validation, in three strengths

- **Hard** (blocks saving): negative or non-numeric amounts, a missing day
  total, a future date, absurd values.
- **Soft** (warns, still saves): Swiggy + Zomato above the day total; Veg +
  Non-Veg above it; expenses above sales. The hotel may legitimately record
  things this app cannot model, so a warning never becomes a wall.
- **Informational**: "Veg + Non-Veg cover ₹5,000 of the ₹10,000 day total."

Duplicate dates cannot happen — the date is the document id. Choosing a date
that already has sales loads them and switches the screen to editing.

## Keeping the data honest

Three things exist because a wrong number is worse than no number:

- **Missing days** are listed on the dashboard. The month's average divides by
  days recorded, so an unnoticed gap quietly flatters it.
- **Offline from a cold start**, the dashboard says so rather than totalling up
  only the entries queued on that device.
- **Unsent writes** are queued in `localStorage`
  ([`services/outbox.ts`](./src/services/outbox.ts)) and flushed on reconnect, so
  an entry made on a bad connection survives the app being closed. Every queued
  operation is an idempotent overwrite keyed by document id, which is what makes
  "queue, send, then dequeue" safe to replay.

## Charts

Colours are validated with the `dataviz` six-check validator against a white
surface, not chosen by eye (`src/lib/chart-palette.ts`). Veg/Non-Veg reuse the
logo's own green and red diet marks.

There is **one** chart — daily bars with the target drawn across them, which
answers "how did each day do" and "did it beat target" in a single glance.
Channel and Veg/Non-Veg splits are labelled meters: on a 360px screen a bar with
the name, amount and percentage beside it reads instantly, and colour never
carries meaning on its own.

## The report image

[`src/components/reports/report-canvas.tsx`](./src/components/reports/report-canvas.tsx)
renders at a fixed **1080 × 1350** off-screen, so the image is identical
whatever phone generated it. Fonts are self-hosted, so capture works offline and
cannot be broken by a webfont CDN. If embedding ever fails it retries without
fonts rather than leaving the manager with nothing.

Sharing uses `navigator.share()` with a real `File` where the device supports
it, and falls back to a download everywhere else.

## Testing

```bash
npm test     # 31 calculation tests
```

Browser testing was done with Puppeteer against the production build: the full
login → enter → save → share flow, every validation rule, duplicate dates, leap
February, zero targets, offline state, the historical-MTD cut, and no horizontal
overflow at 320/360/375/390/412/430px.

A further 16 checks ran against the **live** Firebase project, covering sign-in,
real reads and writes, cross-device sync, and that the security rules refuse bad
data and signed-out access. See FIREBASE-SETUP.md.

## Deployment

`npm run build` writes into `../sales`, which is committed and served by Netlify
straight from the repo. The existing portfolio deploy is untouched — there is no
build step on Netlify to fail. `netlify.toml` adds the SPA rewrite for in-app
routes and long-lived caching for hashed assets.
