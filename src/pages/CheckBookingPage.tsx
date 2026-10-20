import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Loader2, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, fieldAria, PageHeader, SummaryRow } from "@/components/common";
import { ContactCard } from "@/components/facility";
import { StatusBadge, StatusGlossary } from "@/components/status";
import { statusInfo } from "@/config/statuses";
import { useBooking } from "@/context/BookingContext";
import { isLookupEnabled, lookupBooking, type LookupResponse } from "@/lib/external";
import { EXAMPLE_REFERENCE } from "@/lib/reference";
import { formatDate, isValidDateString } from "@/lib/time";
import { isValidReference, normalizePhMobile, normalizeReference } from "@/lib/validation";

export default function CheckBookingPage() {
  const { submitted } = useBooking();
  const lookupEnabled = isLookupEnabled();
  const [reference, setReference] = useState(submitted?.reference ?? "");
  const [mobile, setMobile] = useState("");
  const [errors, setErrors] = useState<{ reference?: string; mobile?: string }>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResponse | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    const found: typeof errors = {};
    if (!isValidReference(reference)) found.reference = `Enter your booking reference, e.g. ${EXAMPLE_REFERENCE}.`;
    const normalized = normalizePhMobile(mobile);
    if (!normalized) found.mobile = "Enter the mobile number you used when booking.";
    setErrors(found);
    if (Object.keys(found).length || !normalized) return;
    setLoading(true);
    setResult(null);
    setResult(await lookupBooking(normalizeReference(reference), normalized));
    setLoading(false);
  }

  return (
    <>
      <PageHeader
        eyebrow="Bookings"
        title="Check your booking"
        description="Enter your booking reference and the mobile number you used to book."
      />
      <div className="container grid gap-8 py-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {!lookupEnabled && (
            <Alert variant="info">
              <AlertTriangle />
              <AlertTitle>Online status lookup isn't available yet</AlertTitle>
              <AlertDescription>
                To protect your details, booking records aren't readable from this website. Please message the front desk
                with your booking reference - staff will tell you your current status.
              </AlertDescription>
            </Alert>
          )}

          {submitted && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Request sent from this device</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-mono text-xl font-extrabold text-primary">{submitted.reference}</p>
                <p className="text-sm text-muted-foreground">
                  This shows what you sent in this browser session. Status updates come from staff.
                </p>
                <Button asChild variant="outline">
                  <Link to="/booking/submitted">View request & payment instructions</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {lookupEnabled && (
            <form onSubmit={submit} noValidate className="space-y-5" aria-label="Booking lookup">
              <Card>
                <CardContent className="space-y-5 pt-5 sm:pt-6">
                  <Field id="reference" label="Booking reference" required error={errors.reference}>
                    <Input
                      {...fieldAria("reference", errors.reference)}
                      value={reference}
                      onChange={(e) => setReference(e.target.value.toUpperCase())}
                      placeholder={EXAMPLE_REFERENCE}
                      autoCapitalize="characters"
                      autoComplete="off"
                      spellCheck={false}
                      className="font-mono uppercase tracking-wide"
                      maxLength={20}
                    />
                  </Field>
                  <Field id="mobile" label="Mobile number" required error={errors.mobile}>
                    <Input
                      {...fieldAria("mobile", errors.mobile)}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="0917 123 4567"
                      maxLength={20}
                    />
                  </Field>
                </CardContent>
              </Card>
              <Button type="submit" size="xl" disabled={loading} aria-busy={loading} className="w-full sm:w-auto">
                {loading ? <><Loader2 className="animate-spin" /> Checking…</> : <><Search /> Check booking</>}
              </Button>
            </form>
          )}

          <div aria-live="polite">
            {result?.kind === "found" && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Booking status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <StatusBadge status={result.booking.status} />
                  <p className="text-sm text-muted-foreground">{statusInfo[result.booking.status].description}</p>
                  <dl className="divide-y">
                    {result.booking.court && <SummaryRow label="Court" value={result.booking.court} />}
                    {result.booking.date && (
                      <SummaryRow
                        label="Date"
                        value={isValidDateString(result.booking.date) ? formatDate(result.booking.date, "long") : result.booking.date}
                      />
                    )}
                    {result.booking.time && <SummaryRow label="Time" value={result.booking.time} />}
                    {result.booking.updatedAt && <SummaryRow label="Last updated" value={result.booking.updatedAt} />}
                  </dl>
                  {result.booking.note && <p className="rounded-lg bg-muted p-3 text-sm">{result.booking.note}</p>}
                </CardContent>
              </Card>
            )}
            {result?.kind === "not_found" && (
              <Alert variant="warning">
                <AlertTriangle />
                <AlertTitle>No matching booking found</AlertTitle>
                <AlertDescription>
                  Check the reference and mobile number. New requests can take a few minutes to appear. Still stuck? Contact the front desk.
                </AlertDescription>
              </Alert>
            )}
            {result?.kind === "error" && (
              <Alert variant="destructive" role="alert">
                <AlertTriangle />
                <AlertTitle>We couldn't check your booking</AlertTitle>
                <AlertDescription>{result.message} You can also contact the front desk.</AlertDescription>
              </Alert>
            )}
          </div>

          <section aria-labelledby="statuses">
            <h2 id="statuses" className="mb-3 text-lg font-bold">What the statuses mean</h2>
            <StatusGlossary />
          </section>
        </div>
        <aside>
          <ContactCard reference={isValidReference(reference) ? normalizeReference(reference) : undefined} />
        </aside>
      </div>
    </>
  );
}
