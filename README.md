# Pickleball Court Booking

A mobile-first website where customers reserve a pickleball court without an account, pay by GCash or bank transfer, and upload their receipt. There is **no custom database and no login**: booking requests and receipts are sent to an external form service, and staff verify payments and confirm bookings by hand.

The product requirements are in [docs/PRD.md](docs/PRD.md). The day-to-day staff process is in [docs/STAFF.md](docs/STAFF.md).

Built with React 18, Vite 5, TypeScript, Tailwind CSS, shadcn/ui-style components, Lucide icons and vite-plugin-pwa.

## Quick start

```bash
npm install
cp .env.example .env.local   # set VITE_SUBMISSION_PROVIDER=demo to try it locally
npm run dev                  # http://localhost:5173
```

In `demo` mode a yellow banner shows at the top and **nothing is sent anywhere**. Demo mode only works in development; a production build with `demo` refuses all submissions.

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm test` | Unit tests (time, slots, pricing, validation, submission acknowledgement) |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |

## Before going live (checklist)

1. **Real payment details.** In [src/config/payment.ts](src/config/payment.ts), replace the GCash name/number and bank details, replace `public/gcash-qr.svg` with the official GCash QR, then set `isSample: false`. While `isSample` is `true`, customers see a red "do not send money" warning and the build prints a warning.
2. **Facility details.** In [src/config/facility.ts](src/config/facility.ts): name, contact numbers, email, Messenger link, address, map link, opening hours, closed dates, privacy contact and booking reference prefix. Also update the `<title>` in `index.html` and the PWA `name`/`short_name` in `vite.config.ts`.
3. **Courts and rates.** [src/config/courts.ts](src/config/courts.ts): courts, photos (put them in `public/courts/`), hourly and peak rates, peak windows, add-ons.
4. **Policies.** [src/config/policies.ts](src/config/policies.ts) and the privacy notice in [src/pages/PrivacyPage.tsx](src/pages/PrivacyPage.tsx).
5. **Booking service.** Choose a provider (below), set the environment variables on your host, deploy, then do one real booking **and** one receipt upload with a file. Check that both arrive, that staff get an email, and that the receipt file opens.
6. **Access and retention.** In the service's settings, limit who can see submissions, turn on 2-factor login for staff accounts, and set a retention/deletion schedule (PRD section 8).

## Choosing the booking service

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

- **No false confirmations.** The success page appears only after the service explicitly acknowledges the request. Timeouts, offline mode, errors and misconfiguration all show a clear error and the front-desk contact. A retry reuses the same booking reference, so staff can spot duplicates.
- **Statuses are honest.** The site only ever shows "Awaiting Payment" (request acknowledged) or "Payment Submitted" (receipt acknowledged). "Under Verification", "Confirmed", "Unavailable" and "Cancelled" come from staff, or from the optional lookup service.
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
- Payment verification, confirmation, cancellation and refunds are manual.
- A second receipt with the same booking reference **and** transaction number in the same browser session is treated as a duplicate and not re-sent.
