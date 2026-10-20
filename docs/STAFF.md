# Staff guide: verifying payments and confirming bookings

The website only collects **requests** and **receipts**. Nothing is reserved until a staff member confirms it. Work from the booking service (Formspree, Netlify or your sheet), your schedule, and the real GCash/bank records.

## What you receive

**Booking request** (email subject starts with "New booking request"):
reference (e.g. `DD-261020-7KQ3P`), court, date, start and end time, duration, estimated total and fee breakdown, customer name, mobile, and optionally email, players and special requests.

**Payment receipt** (subject starts with "Payment receipt for"):
reference, payment method, transaction reference number, amount paid, expected amount and whether they match, court/date/time when known, mobile, and the receipt file.

Match the two using the **booking reference**. If two requests share a reference, it's the same customer retrying after a connection problem: keep one.

## Daily workflow

1. **New request:** check the court and time in your schedule.
   - Conflict? Contact the customer and offer another slot. If they already paid, refund in full. Status: **Unavailable**.
   - Free? Pencil it in as held. Status: **Awaiting Payment**. Unpaid requests may be released after 2 hours (the website tells customers this).
2. **Receipt arrives:** status is **Payment Submitted**. Then **Under Verification** while you check:
   - Open the **GCash app / business dashboard or bank statement** and find the transaction by reference number.
   - Confirm the **amount** matches the booking total (the email says if the customer typed a different amount), the **date**, and that the money reached **our** account.
   - **A screenshot alone is not proof of payment.** Receipts can be edited. Only the actual transaction in our records counts.
3. **Confirm the court is still free**, then mark the booking **Confirmed** in your schedule.
4. **Notify the customer** by SMS (and email if given), for example:
   > Hi Maria, your booking DD-261020-7KQ3P is CONFIRMED: Court 2, Thu Oct 22, 6:00-8:00 PM. Please arrive 10 minutes early. - Dink District
5. **Cancellations and refunds** follow the published policy (Policies page). Refund manually to the same GCash number or bank account, then mark the booking **Cancelled**.

## Status meanings (same wording customers see)

| Status | Meaning |
|---|---|
| Request Submitted | The booking service received the request. |
| Awaiting Payment | Request received; payment pending. |
| Payment Submitted | Customer sent payment details / receipt. |
| Under Verification | Staff are checking payment and court availability. |
| Confirmed | Staff verified payment and approved the reservation. |
| Unavailable | The requested slot can't be reserved. |
| Cancelled | Cancelled under the facility's policy. |

The website never changes a status on its own after the receipt step. Customers learn about **Confirmed**, **Unavailable** and **Cancelled** only from you (or from the optional lookup service, if one is set up).

## Privacy

- Only authorised staff should have access to the booking service. Use 2-factor login.
- Don't forward receipts or customer details outside the team. Delete old submissions on the agreed retention schedule.
- Privacy requests (access, correction, deletion) arrive at the privacy email on the Privacy page. Reply and act on them promptly.
