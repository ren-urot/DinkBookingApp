# Staff guide: verifying payments and confirming bookings

The website only collects **requests** and **receipts**. Nothing is reserved until a staff member confirms it. Work from your messages (or the booking service, if one is set up), your schedule, and the real GCash/bank records.

## Where bookings arrive

- **Phone mode (default):** customers send messages from their own phone. Check **all four inboxes** during staff hours: the facility's **SMS** number, **Viber**, the **Facebook Page inbox (Messenger)** and the **bookings email**.
- **Form service (if set up):** emails from Formspree/Netlify plus the service's submissions list.

**Reply to every booking message right away**, even just "Received, checking availability". In phone mode the website tells customers to expect your reply. It's their only proof the message arrived.

## What you receive

**Booking request** (message starts with "BOOKING REQUEST", or email subject "New booking request"):
reference (e.g. `DD-261020-7KQ3P`), court, date, time and duration, estimated total, customer name, mobile, and optionally email, players and special requests.

**Payment receipt** (message starts with "PAYMENT RECEIPT", or email subject "Payment receipt for"):
reference, payment method, transaction reference number, amount paid, the booking details when known, and the receipt screenshot. In phone mode the customer attaches the screenshot themselves; if it's missing, ask for it.

Phone-mode messages are typed into the customer's own app, so they **can be edited before sending**. Always check the court, time and total against the rates on the website, and the payment against your GCash/bank records.

Match the two using the **booking reference**. If two requests share a reference, it's the same customer retrying after a connection problem: keep one.

## Daily workflow

The **booked-slots Google Sheet** is your schedule. Every time you add a row, the website greys out that court and time within about a minute, so nobody else can request it. Rows with Status `Confirmed` or `Held` block the time; change Status to `Cancelled` (or delete the row) to free it. **Only court, date, times, status and reference go in the sheet - never names or phone numbers.** It's readable by anyone with the link.

1. **New request:** check the court and time in the sheet.
   - Conflict? Contact the customer and offer another slot. If they already paid, refund in full. Status: **Unavailable**.
   - Free? **Add a row with Status `Held`** and reply that you received it. Status: **Awaiting Payment**. Unpaid requests may be released after 2 hours (the website tells customers this); change that row to `Cancelled` if they don't pay.
2. **Receipt arrives:** status is **Payment Submitted**. Then **Under Verification** while you check:
   - Open the **GCash app / business dashboard or bank statement** and find the transaction by reference number.
   - Confirm the **amount** matches the booking total (the email says if the customer typed a different amount), the **date**, and that the money reached **our** account.
   - **A screenshot alone is not proof of payment.** Receipts can be edited. Only the actual transaction in our records counts.
3. **Confirm the court is still free**, then change the row's Status to **`Confirmed`** in the sheet.
4. **Notify the customer** by SMS (and email if given), for example:
   > Hi Maria, your booking DD-261020-7KQ3P is CONFIRMED: Court 2, Thu Oct 22, 6:00-8:00 PM. Please arrive 10 minutes early. - Dink District
5. **Cancellations and refunds** follow the published policy (Policies page). Refund manually to the same GCash number or bank account, then set the row's Status to **`Cancelled`** so the time opens up again.

## Status meanings (same wording customers see)

| Status | Meaning |
|---|---|
| Request Sent | Phone mode: the customer sent the request from their phone. Your reply confirms you received it. |
| Request Submitted | Form service: the booking service received the request. |
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
