import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { CalendarPlus, CheckCircle2, Clock, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton, SummaryRow } from "@/components/common";
import { ContactCard } from "@/components/facility";
import { PaymentInstructions } from "@/components/payment";
import { StatusBadge, StatusTimeline } from "@/components/status";
import { bookingRules, facility } from "@/config/facility";
import { services } from "@/config/services";
import type { PaymentMethod } from "@/config/payment";
import { useBooking } from "@/context/BookingContext";
import { bookingFromParams, bookingToParams } from "@/lib/bookingUrl";
import { formatPeso } from "@/lib/pricing";
import type { BookingSummary } from "@/lib/submit";
import { facilityNow, formatDate, formatDuration, formatTimeRange } from "@/lib/time";
import { formatPhMobile } from "@/lib/validation";

export default function ConfirmationPage() {
  const { submitted, receiptSentFor } = useBooking();
  const [params] = useSearchParams();
  const [method, setMethod] = useState<PaymentMethod>("gcash");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Personal details are only known in the session that submitted the request;
  // after a reload the URL still carries the reference, court, time and amount.
  const fromUrl = bookingFromParams(params);
  const booking: BookingSummary | null =
    submitted && (!fromUrl || fromUrl.reference === submitted.reference) ? submitted : fromUrl;
  if (!booking) return <Navigate to="/check-booking" replace />;

  const receiptVia = receiptSentFor[booking.reference];
  const receiptSent = Boolean(receiptVia);
  const phoneMode = services.deliveryMode === "phone";
  // Sent from the customer's phone (phone mode, or the backup after a service error): the site
  // only knows the customer says they sent it, not that it arrived.
  const sentByPhone = phoneMode || params.get("via") === "phone";
  const status = receiptSent ? "payment_submitted" : sentByPhone ? "request_sent" : "awaiting_payment";
  const payParams = bookingToParams(booking);
  payParams.set("method", method);
  if (sentByPhone && !phoneMode) payParams.set("via", "phone");
  const now = facilityNow();
  const startsSoon = booking.date === now.date && booking.start - now.minutes < bookingRules.paymentWindowHours * 60;

  return (
    <div className="container max-w-4xl py-8 sm:py-12">
      <div className="mb-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-primary" aria-hidden="true" />
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold tracking-tight outline-none sm:text-3xl">
          {sentByPhone ? "Booking request sent" : "Booking request submitted"}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Your booking request has been submitted. Please complete your payment and wait for the facility to verify your
          payment and confirm your reservation.
        </p>
        {sentByPhone && (
          <p className="mx-auto mt-3 max-w-xl rounded-lg bg-secondary p-3 text-sm">
            The facility will reply to your message to let you know they received it. No reply within 30 minutes during
            staff hours ({facility.contact.responseHours})? Call {facility.contact.phone}.
          </p>
        )}
      </div>

      <Card className="mb-6 border-primary/40">
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Booking reference</p>
            <p className="font-mono text-3xl font-extrabold tracking-wider text-primary">{booking.reference}</p>
            <p className="mt-1 text-xs text-muted-foreground">Save this - take a screenshot. You'll need it to pay and to contact us.</p>
          </div>
          <div className="flex flex-col items-center gap-2 sm:items-end">
            <StatusBadge status={status} />
            <CopyButton value={booking.reference} label="Booking reference" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Booking details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              {booking.fullName && <SummaryRow label="Name" value={booking.fullName} />}
              {booking.mobile && <SummaryRow label="Mobile" value={formatPhMobile(booking.mobile)} />}
              <SummaryRow label="Court" value={booking.court.name} />
              <SummaryRow label="Date" value={formatDate(booking.date, "long")} />
              <SummaryRow label="Time" value={formatTimeRange(booking.start, booking.duration)} />
              <SummaryRow label="Duration" value={formatDuration(booking.duration)} />
              <SummaryRow label="Total rental fee" value={formatPeso(booking.fee.total)} strong />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Current status</CardTitle>
            <CardDescription>We'll contact you by SMS{booking.email ? " or email" : ""} when staff update your booking.</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusTimeline current={status} sentByPhone={sentByPhone} />
          </CardContent>
        </Card>
      </div>

      {receiptSent ? (
        <Alert variant="success" className="mt-6">
          <CheckCircle2 />
          <AlertTitle>{receiptVia === "phone" ? "Payment details sent" : "Payment details received"}</AlertTitle>
          <AlertDescription>
            Staff will verify your payment against our records and confirm the court is available. Your booking is not
            confirmed until you hear from us.
          </AlertDescription>
        </Alert>
      ) : (
        <section className="mt-8" aria-labelledby="pay-heading">
          <div className="mb-4">
            <h2 id="pay-heading" className="text-xl font-extrabold">Step 2: Pay {formatPeso(booking.fee.total)}</h2>
            {startsSoon ? (
              <p className="mt-2 flex gap-1.5 rounded-lg bg-warning p-3 text-sm font-semibold text-warning-foreground">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Your slot starts soon - please pay right away and send your receipt so staff have time to verify it.
              </p>
            ) : (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" aria-hidden="true" />
                Please pay within {bookingRules.paymentWindowHours} hours, or the slot may be released.
              </p>
            )}
          </div>
          <PaymentInstructions amount={booking.fee.total} reference={booking.reference} defaultMethod={method} onMethodChange={setMethod} />

          <Card className="mt-6 bg-secondary/60">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">Step 3: Paid already? {phoneMode ? "Send your receipt" : "Upload your receipt"}</p>
                <p className="text-sm text-muted-foreground">Have your transaction reference number and screenshot ready.</p>
              </div>
              <Button asChild size="lg">
                <Link to={`/pay?${payParams}`}>
                  <Upload /> {phoneMode ? "Send payment receipt" : "Submit payment receipt"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <ContactCard reference={booking.reference} />
        <Card>
          <CardHeader>
            <CardTitle>What happens next</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Staff check the requested court and time for conflicts.</li>
              <li>They verify your payment against our GCash or bank records. A receipt alone isn't proof of payment.</li>
              <li>You'll get a confirmation by SMS{booking.email ? " or email" : ""} - or a call if the slot is unavailable, with a full refund of anything you paid.</li>
            </ol>
            <Button asChild variant="outline" className="mt-5 w-full">
              <Link to="/book"><CalendarPlus /> Book another court</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
