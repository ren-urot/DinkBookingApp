# Product Requirements Document (PRD) — Pickleball Booking App

**Product Type:** Responsive Web Application / Progressive Web App (PWA)
**Authentication:** None
**Custom Database:** None
**Booking Method:** External booking submission service
**Payment Method:** GCash or bank transfer with manual verification
**Primary Goal:** Allow customers to reserve pickleball courts quickly from their phones without creating an account, while enabling the facility to receive booking requests and manually verify payments.

## 1. Product Overview

The Pickleball Booking App is a lightweight, modern court reservation platform designed for pickleball facilities, clubs, and court operators.

Customers can browse courts, select a date and time, submit their contact information, and pay through GCash or bank transfer. They can upload their payment receipt for manual verification by the facility.

The app will not use a custom database, require login, or maintain customer accounts. Booking requests will be transmitted to an external service that the facility can access to receive and manage reservations.

The system must distinguish between a submitted booking request, a submitted payment receipt, a verified payment, and a confirmed reservation.

## 2. Product Objectives

- Enable court reservations without registration.
- Make the booking process fast and mobile-friendly.
- Accept real booking requests through an external service.
- Support GCash and bank transfers.
- Allow facility staff to verify payments manually.
- Minimize development and hosting costs.
- Avoid a custom backend and database.
- Prevent misleading availability and payment confirmation messages.

## 3. Target Users

**Customers:** individual players; groups of friends and recreational players; teams organizing matches; customers reserving courts for practice or events.

**Facility Staff:** court owners and operators; receptionists handling reservations; staff responsible for verifying payments and confirming bookings.

## 4. Core Features

### 4.1 Homepage

The homepage should include:

- Facility logo and name.
- Hero section with a prominent **Book a Court** CTA.
- Brief introduction to the facility.
- Featured court cards.
- Court rental rates.
- Operating hours.
- Booking instructions.
- GCash and bank transfer payment information.
- Facility location and contact details.
- Cancellation and refund policy.

The homepage should prioritize the booking action and avoid unnecessary content.

### 4.2 Court Listing

Display available courts in a clean card layout. Each court card includes:

- Court name or number.
- Court image.
- Indoor or outdoor designation.
- Court features, if applicable.
- Hourly rental rate.
- Operating schedule.
- **Book This Court** button.

Court details and rates will be maintained in static configuration files rather than a database.

### 4.3 Date and Time Selection

Customers can:

1. Select a court.
2. Select their preferred booking date.
3. Choose a time slot.
4. Select the booking duration.
5. View the estimated rental fee.
6. Proceed to the booking form.

The interface must clearly display selected dates, times, and prices.

**Availability limitation:** Because there is no shared booking database or custom booking backend, static schedules alone cannot guarantee real-time availability. Before confirming a reservation, facility staff must check for schedule conflicts. If an external service provides shared schedule data, the app may use it to display availability, subject to that service's capabilities.

### 4.4 Guest Booking Form

No account or login is required.

Required fields: full name; mobile number; booking date; selected court; start time; booking duration.

Optional fields: email address; number of players; special requests.

The form must validate required fields and calculate the estimated total rental fee.

Before submission, show a booking summary containing the customer's details, selected court, date, time, duration, and total price.

### 4.5 External Booking Submission

All booking requests must be submitted to a configured external service.

The selected service should support receiving form submissions and making booking details available to facility staff, preferably through email notifications and a management dashboard or structured submission list.

Booking submission workflow:

1. Customer completes the booking form.
2. The app validates the information.
3. The app generates a unique booking reference.
4. The booking request is submitted to the external service.
5. The service acknowledges successful receipt.
6. The customer sees a booking request confirmation.
7. Facility staff check schedule availability and contact the customer if necessary.

Only display a successful submission message after the external service acknowledges the request.

The integration must be implemented through a supported endpoint or service-provided form. Any secret API credentials must remain server-side and must never be embedded in public frontend code.

### 4.6 Payment Instructions

After submitting a booking request, the customer receives payment instructions.

**GCash:** display the facility's official GCash account name; display the registered mobile number or QR code; state the amount to pay; require the customer to enter the GCash reference number.

**Bank Transfer:** display the bank name; display the account holder's name; display the account number; state the amount to pay; require the customer to enter the transaction reference number.

Payment details must be configurable and must not be hardcoded into multiple pages.

### 4.7 Payment Receipt Submission

Customers can submit proof of payment using an upload form.

Required fields: booking reference; payment method; transaction reference number; amount paid; payment receipt image or screenshot.

The receipt and associated booking details must be sent to an external service that supports file uploads.

The app must validate file types and size on the client side. The external service must also enforce its own upload limits and access controls.

Do not store payment receipts or personal information in browser localStorage as the primary submission method.

If the chosen external service cannot securely accept file uploads, use a separate approved receipt-upload service and include the booking reference to associate the receipt with the correct reservation.

### 4.8 Manual Payment Verification

Facility staff verify payments outside the app using the payment provider's records or bank statement.

1. Receive the booking request.
2. Check the requested court and time.
3. Review the submitted receipt.
4. Verify that the payment was actually received.
5. Confirm that the court remains available.
6. Mark the booking as confirmed using the facility's external workflow.
7. Notify the customer through the provided contact details.

An uploaded receipt alone is not proof of payment.

The initial version will not include a custom admin dashboard. Booking management and payment verification will take place within the selected external service or through the facility's existing process.

### 4.9 Booking Statuses

- **Request Submitted:** The external service received the booking request.
- **Awaiting Payment:** The booking request has been received and payment is pending.
- **Payment Submitted:** The customer has submitted payment details or a receipt.
- **Under Verification:** Staff are checking payment and court availability.
- **Confirmed:** Staff verified payment and approved the reservation.
- **Unavailable:** The requested time slot cannot be reserved.
- **Cancelled:** The reservation has been cancelled under the facility's policy.

These statuses require an external workflow to maintain authoritative updates. The static frontend must not imply that a status has changed unless that change is supported by the external service or communicated by staff.

### 4.10 Customer Confirmation

After booking submission, display: booking reference; customer name; court; booking date and time; duration; total rental fee; payment instructions; current booking status; facility contact details.

After successful submission, clearly state:

"Your booking request has been submitted. Please complete your payment and wait for the facility to verify your payment and confirm your reservation."

After staff confirmation, the facility can send confirmation by SMS, email, or another supported communication channel.

### 4.11 Booking Lookup

Provide an optional **Check Booking** page without login.

Customers enter their booking reference and a verification detail, such as their registered mobile number.

The page may retrieve booking information only if the external service supports secure lookup. A static frontend cannot securely retrieve private booking information from an arbitrary submission list.

If the chosen external service does not support this capability, customers should check their booking through the facility's contact channel instead.

## 5. Booking Workflow

**Customer journey:** open the website; browse available courts; select a court, date, and time; enter booking details; review the booking summary; submit the booking request; receive a booking reference and payment instructions; pay through GCash or bank transfer; submit the payment reference and receipt; wait for manual verification; receive final confirmation from the facility.

**Facility workflow:** receive a booking request; check the requested time slot for conflicts; review the requested rental duration and fee; check payment information and receipt; verify payment through the actual payment provider; confirm or reject the booking; notify the customer.

## 6. Technology Stack

**Frontend:** React, Vite, TypeScript, Tailwind CSS, shadcn/ui, Lucide icons.

**External services** must support: booking form submissions; email notifications; secure receipt uploads; staff access to submitted bookings; optional booking lookup or status updates; optional SMS or email confirmation. The specific provider must be selected before implementation; support for file uploads, private records and status updates must be verified before relying on them.

**Hosting:** Vercel, Netlify, or equivalent static hosting; HTTPS; custom domain support; optional PWA installation.

**Storage:** no custom database. Static configuration files may hold public facility information, court descriptions, rates, opening hours, and payment instructions. The external service holds submitted booking requests and payment receipt records. Browser localStorage may be used for non-sensitive preferences, but not as the authoritative booking record.

## 7. UI/UX Requirements

**Design direction:** modern, energetic, sports-oriented. Light background; pickleball-green primary accent; white cards; subtle borders and shadows; clear typography; large touch-friendly buttons; high-contrast time-slot states; minimal navigation.

**Navigation:** Home; Courts; Rates; Book a Court; Contact.

**Mobile-first:** responsive layouts for phones, tablets, and desktops; large date and time selection controls; short forms with clear labels; minimal typing wherever practical; payment instructions optimized for mobile; receipt upload from the device's photo library; clear progress indicators and submission feedback.

## 8. Privacy and Security

- Use HTTPS for all booking and receipt submissions.
- Collect only the information needed to manage reservations.
- Provide a privacy notice and consent where appropriate.
- Do not expose customer submissions through public endpoints.
- Do not place secret service credentials in frontend code.
- Use access-controlled external storage for payment receipts.
- Validate uploaded files and enforce file-size limits.
- Avoid storing sensitive booking or payment information in localStorage.
- Configure access permissions and retention policies on the external service.
- Provide a contact method for privacy-related requests.

## 9. Non-Functional Requirements

Fast page loading; mobile-first responsive design; accessible forms and keyboard navigation; client-side input validation; clear error and success messages; protection against accidental duplicate submissions; graceful handling of external service failures; no authentication or registration for customers; no custom database or custom backend in the initial version; clear distinction between booking submission and reservation confirmation.

## 10. Out of Scope

User accounts; customer login; custom database; custom backend or admin dashboard; automated payment gateway integration; automatic payment verification; automated refunds; membership and loyalty features; cross-device booking history maintained by the frontend itself; guaranteed real-time court availability without a suitable shared source.

## 11. Acceptance Criteria

1. Customers can browse courts and rates.
2. Customers can select a court, date, time, and duration.
3. Customers can submit booking requests without logging in.
4. Booking requests reach the configured external service.
5. The app generates and displays a booking reference.
6. Customers can view GCash and bank transfer instructions.
7. Customers can submit payment references and receipts through the configured service.
8. Facility staff can access the booking requests and receipts securely.
9. Staff can manually verify payments and approve reservations through the external workflow.
10. Customers receive clear instructions on what happens after submitting a request.
11. The app does not claim a booking is confirmed before staff approval.
12. The app works on mobile and desktop.
13. No custom database or customer authentication system is required.
14. External service failures are handled with clear messages and no false success confirmations.

## 12. Recommended MVP Scope

Homepage; court listing and rental rates; court selection; date and time selection; booking form; booking reference generation; external booking submission; GCash and bank transfer instructions; payment receipt submission; staff-managed manual verification; booking request confirmation page; contact and cancellation information; responsive PWA-ready interface.

## 13. Key Implementation Decision

The external service becomes the authoritative source for submitted requests and receipts. Select an external service that supports the required booking submissions, secure receipt uploads, and staff workflow. Confirm whether it supports conflict checking and booking-status updates; if not, those steps remain manual.

Preventing double bookings depends on how the external service handles availability. For the first version, manual schedule checking is the simplest approach.
