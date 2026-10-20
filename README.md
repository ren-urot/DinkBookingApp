# Pickleball Court Booking

A mobile-first website where customers reserve a pickleball court without an account, pay by GCash or bank transfer, and send their receipt. There is **no server, no database and no login**: it's a static site, and staff verify payments and confirm bookings by hand.

Booking requests and receipts reach the facility in one of two ways:

- **Phone mode (default, zero setup):** the site writes the message and the customer sends it from their own phone by SMS, Viber, Messenger or email. On phones, the share menu attaches the receipt screenshot automatically. The site can't see whether a message was sent, so it says "Request Sent" (not "received") and tells the customer the facility will reply.
- **Form service (optional upgrade):** set up Formspree, Netlify Forms or a webhook (below) and the site switches automatically. Staff then get emails and a submissions list, and the site confirms each request was received. If the service ever fails, customers are offered phone mode as a backup.

The product requirements are in [docs/PRD.md](docs/PRD.md). The day-to-day staff process is in [docs/STAFF.md](docs/STAFF.md).

Built with React 18, Vite 5, TypeScript, Tailwind CSS, shadcn/ui-style components, Lucide icons and vite-plugin-pwa.

## Quick start

```bash
npm install
cp .env.example .env.local   # empty provider = phone mode; "demo" simulates a form service
npm run dev                  # http://localhost:5173
```

In `demo` mode a yellow banner shows at the top and **nothing is sent anywhere**. Demo mode only works in development; a production build treats it as empty (phone mode).

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm test` | Unit tests (time, slots, pricing, validation, submission acknowledgement) |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |

## Before going live (checklist)

1. **Real payment details.** In [src/config/payment.ts](src/config/payment.ts), replace the GCash name/number and bank details, replace `public/gcash-qr.svg` with the official GCash QR, then set `isSample: false`. While `isSample` is `true`, customers see a red "do not send money" warning and the build prints a warning.
2. **Facility details.** In [src/config/facility.ts](src/config/facility.ts): name, contact numbers (`sms` is where phone-mode SMS go), email, Messenger link, address, map link, opening hours, closed dates, privacy contact and booking reference prefix. Also update the `<title>` in `index.html` and the PWA `name`/`short_name` in `vite.config.ts`.
3. **Courts and rates.** [src/config/courts.ts](src/config/courts.ts): courts, photos (put them in `public/courts/`), hourly and peak rates, peak windows, add-ons.
4. **Policies.** [src/config/policies.ts](src/config/policies.ts) and the privacy notice in [src/pages/PrivacyPage.tsx](src/pages/PrivacyPage.tsx).
5. **Test delivery.** Phone mode: from a real phone, send one booking and one receipt through each channel (SMS, Viber, Messenger, email) and check they arrive at the facility's number, Viber, Facebook Page inbox and email. Form service: do one real booking **and** one receipt upload with a file, and check both arrive and the receipt opens.
6. **Access and retention.** Keep the facility phone, Viber, Page inbox and email (or the form service) limited to authorised staff with 2-factor login, and delete old booking messages on a schedule (PRD section 8).

## Blocking booked times with a Google Sheet

The website can't know about bookings by itself. To grey out times that are already taken, staff keep a Google Sheet and the site reads it (still no server or database of your own). Changes show on the site within about a minute.

**One-time setup**
1. In Google Sheets, **File → Import** [docs/booked-slots-template.csv](docs/booked-slots-template.csv), or create a sheet whose **first tab** has these headers in row 1: `Court`, `Date`, `Start`, `End`, `Status`, `Reference`.
2. Select the Date, Start and End columns → **Format → Number → Plain text**, so Google doesn't reformat them.
3. **Share → General access → Anyone with the link → Viewer**, then copy the link.
4. In Vercel → Project → Settings → Environment Variables, add `VITE_BOOKED_SHEET_URL` = that link, then redeploy (or push any commit).

**Filling it in** (one row per booking)

| Column | What to type | Examples |
|---|---|---|
| Court | Court code, number or name | `C1`, `2`, `Court 3` |
| Date | Year-month-day | `2026-10-24` |
| Start / End | 24-hour or AM/PM | `18:00`, `8:00 PM` |
| Status | `Confirmed` or `Held` block the time; `Cancelled` frees it | `Confirmed` |
| Reference | Optional booking reference | `DD-261020-7KQ3P` |

**Anyone with the link can read this sheet** (the link is inside the website's code). Never put names, phone numbers or payment details in it.

If the sheet can't be read (not shared, renamed columns, Google down), the site says so and keeps taking requests; staff check conflicts by hand as before. Rows the site can't understand are skipped and counted in the browser console.

## Admin page (`/admin`)

Staff manage bookings at **`/admin`** (not linked from the site, hidden from search engines). After entering the admin PIN they can:

- **Add a booking** - paste the customer's booking message and the court, date, time and reference fill in automatically. The page warns about overlaps, and the script refuses double bookings unless staff choose "Save anyway".
- **Confirm / Cancel / Restore** bookings with one tap, and copy a ready-made "your booking is CONFIRMED" message to send the customer.
- **Open the Google Sheet** for anything else.

Every change is written to the booked-slots sheet, so the time is blocked on the website within a minute, and **the customer's confirmation page and Check Booking page show the new status by themselves** (Awaiting Payment → Confirmed, or Cancelled).

**One-time setup (about 5 minutes)**
1. Open the booked-slots Google Sheet → **Extensions → Apps Script**.
2. Delete what's in `Code.gs`, paste the whole of [docs/admin-apps-script.gs](docs/admin-apps-script.gs), and click **Save**.
3. Click the gear (**Project Settings**) → **Script properties** → **Add script property**: name `ADMIN_PIN`, value a PIN of **at least 6 characters** that only staff know → **Save**.
4. **Deploy → New deployment** → gear next to "Select type" → **Web app**. Set **Execute as: Me** and **Who has access: Anyone** → **Deploy**. Google asks you to authorise the script (it only touches this spreadsheet; on the "Google hasn't verified this app" screen choose **Advanced → Go to … (unsafe)** - it's your own script).
5. Copy the **Web app URL** (ends in `/exec`). In Vercel → Project → Settings → Environment Variables add `VITE_ADMIN_SCRIPT_URL` = that URL, then redeploy.

**Security notes**
- The PIN is checked by the script on Google's side and is never in the website's code or saved in the browser. After 10 wrong PINs the script locks for 15 minutes.
- "Who has access: Anyone" only means anyone can *call* the script; without the PIN it does nothing. The script runs as you and can only edit this spreadsheet.
- To change the PIN, edit the `ADMIN_PIN` script property. If you edit the script code, use **Deploy → Manage deployments → Edit → Version: New version** so the URL stays the same.
- Booking status shown to customers comes from the public sheet and is found by booking reference. The sheet has no names or phone numbers, so this reveals only the court, time and status.

## Optional: choosing a form service

Phone mode needs nothing here. A form service adds email notifications, a submissions list for staff, and confirmed receipt of each request.

All settings are `VITE_*` environment variables (see [.env.example](.env.example)). **They are public**: never put a secret API key in them. If a service needs a secret, put it behind a serverless function and point the endpoint at that function.

### Formspree (simplest)
1. Create two forms: "Booking requests" and "Payment receipts". Receipts need a plan that **supports file uploads**.
2. Set `VITE_SUBMISSION_PROVIDER=formspree`, `VITE_BOOKING_ENDPOINT=https://formspree.io/f/<booking id>`, `VITE_RECEIPT_ENDPOINT=https://formspree.io/f/<receipt id>`.
3. Add staff emails as notification recipients. Submissions appear in the Formspree dashboard. When the customer gives an email, Formspree sets it as reply-to, so staff can reply straight from the notification.

### Netlify Forms (if hosted on Netlify)
1. Set `VITE_SUBMISSION_PROVIDER=netlify` (no endpoints needed).
2. In Netlify, turn on **form detection**. The form definitions live in `public/__forms.html`; the app posts there. If you add or rename a field in `src/lib/submit.ts`, update that file too.
3. Add email notifications per form. Check the **Spam** tab occasionally.

### Your own webhook (Google Apps Script, serverless function, Make/Zapier)
- Booking requests arrive as JSON; receipts as `multipart/form-data` with the file in a field named `receipt`.
- Reply with JSON `{"ok": true}` **only after the data is saved**. Any other reply (errors, empty bodies, HTML pages) is shown to the customer as a failure, never as success.
- Allow CORS from your site's domain.

### Optional: booking lookup and shared availability
Leave these empty unless your service supports them securely (see `.env.example` for the request and response format):
- `VITE_LOOKUP_ENDPOINT` must check the reference **and** the mobile number on the server, return only that booking's status, return 404 for any mismatch, and rate-limit requests. Without it, the Check Booking page sends customers to the front desk.
- `VITE_AVAILABILITY_ENDPOINT` lets the app grey out already-reserved slots. Without it, staff check conflicts by hand. It is always advisory: staff still confirm every booking.

## Hosting

Any static host with HTTPS works (Vercel, Netlify, Cloudflare Pages). Build command `npm run build`, output directory `dist`. Set the environment variables in the host's settings, then redeploy. Deep links like `/book` need an SPA fallback to `index.html`; this is already included for Netlify (`public/_redirects`) and Vercel (`vercel.json`). Real files such as `/__forms.html` are still served as-is.

The site is installable as a PWA. When a new version is deployed, visitors see a "Reload" prompt instead of an automatic reload, so a booking in progress is never wiped.

## How it behaves (privacy and safety)

- **No false confirmations.** With a form service, the success page appears only after the service explicitly acknowledges the request; timeouts, offline mode and errors show a clear error plus the phone-mode backup, and a retry reuses the same booking reference so staff can spot duplicates. In phone mode the customer confirms they pressed Send, and the page says "Request Sent" and that the facility will reply.
- **Statuses are honest.** The site only ever shows "Request Sent" (phone mode, customer says they sent it), "Awaiting Payment" (form service acknowledged the request) or "Payment Submitted". "Under Verification", "Confirmed", "Unavailable" and "Cancelled" come from staff, or from the optional lookup service.
- **Nothing personal is stored on the device.** No localStorage or cookies. The confirmation page URL carries only the reference, court, date, time and duration (no name, phone or email), so it survives a reload or a closed tab.
- **Receipt checks.** JPG/PNG/WEBP/HEIC/PDF up to 5 MB, verified by file contents, not just the extension. The service must enforce its own limits too. HEIC photos (iPhone) may need converting before Windows PCs can open them.
- **Spam.** Both forms include a hidden honeypot field; use the provider's spam filtering as well.

## Project layout

```
src/config/     facility, courts & rates, payment accounts, policies, statuses, services (env)
src/lib/        time & slots (facility timezone), pricing, validation, submission adapters, URL state
src/pages/      Home, Courts, Rates, Book (4 steps), Confirmation, Pay (receipt), Check Booking, Contact, Policies, Privacy
src/components/ layout, court cards, payment instructions, status timeline, shadcn/ui primitives
public/         court images, GCash QR, PWA icons, __forms.html (Netlify)
```

## Known limitations (by design, see PRD section 10)

- The website cannot guarantee real-time availability; staff must check conflicts before confirming.
- In phone mode the website cannot know whether a message was really sent or delivered. Staff should reply to every booking message so customers know it arrived.
- Payment verification, confirmation, cancellation and refunds are manual.
- A second receipt with the same booking reference **and** transaction number in the same browser session is treated as a duplicate and not re-sent.
