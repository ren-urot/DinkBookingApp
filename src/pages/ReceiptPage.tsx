import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, FileText, ImagePlus, Landmark, Loader2, RefreshCw, Smartphone, Upload, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, fieldAria, handleChoiceKeys, PageHeader, rovingTabIndex } from "@/components/common";
import { ContactCard } from "@/components/facility";
import { SendViaPhone } from "@/components/messaging";
import { PaymentInstructions } from "@/components/payment";
import { StatusBadge } from "@/components/status";
import { facility } from "@/config/facility";
import { payment, type PaymentMethod } from "@/config/payment";
import { receiptUpload, services } from "@/config/services";
import { useBooking, type SentVia } from "@/context/BookingContext";
import { formatPeso } from "@/lib/pricing";
import { bookingFromParams, bookingToParams } from "@/lib/bookingUrl";
import { receiptMessage, type OutgoingMessage } from "@/lib/message";
import { EXAMPLE_REFERENCE } from "@/lib/reference";
import { nowStamp, SubmissionError, submitPaymentReceipt, type BookingSummary } from "@/lib/submit";
import { cn } from "@/lib/utils";
import {
  formatPhMobile,
  isValidReference,
  normalizePhMobile,
  normalizeReference,
  parseAmount,
  validateReceiptFile,
} from "@/lib/validation";

interface FormState {
  reference: string;
  method: PaymentMethod | "";
  transactionReference: string;
  amount: string;
  mobile: string;
  consent: boolean;
}

type Errors = Partial<Record<keyof FormState | "file", string>>;

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.reference.trim()) e.reference = "Enter the booking reference from your booking request.";
  else if (!isValidReference(f.reference)) e.reference = `That doesn't look like a booking reference (e.g. ${EXAMPLE_REFERENCE}).`;
  if (!f.method) e.method = "Choose how you paid.";
  const txn = f.transactionReference.trim();
  if (!txn) e.transactionReference = "Enter the transaction reference number from your receipt.";
  else if (!/^[A-Za-z0-9-\s]{6,40}$/.test(txn)) e.transactionReference = "Use 6-40 letters or numbers, as shown on your receipt.";
  if (!f.amount.trim()) e.amount = "Enter the amount you paid.";
  else if (parseAmount(f.amount) == null) e.amount = "Enter a valid amount, e.g. 1300 or 1300.50.";
  if (f.mobile.trim() && !normalizePhMobile(f.mobile)) e.mobile = "Enter a valid PH mobile number, or leave it blank.";
  if (!f.consent) e.consent = "Please confirm so we can process your receipt.";
  return e;
}

export default function ReceiptPage() {
  const [params] = useSearchParams();
  const { submitted, receiptSentFor, markReceiptSent } = useBooking();

  const paramRef = normalizeReference(params.get("ref") ?? "");
  // Full details are known if the request was made in this session; after a
  // reload the link from the confirmation page still carries the booking (no personal data).
  const fromUrl = bookingFromParams(params);
  const known: BookingSummary | null =
    submitted && (!paramRef || paramRef === submitted.reference) ? submitted : fromUrl;
  const paramMethod = params.get("method");

  const [form, setForm] = useState<FormState>({
    reference: known?.reference ?? paramRef,
    method: paramMethod === "gcash" || paramMethod === "bank" ? paramMethod : "",
    transactionReference: "",
    amount: known ? String(known.fee.total) : "",
    mobile: known?.mobile ? formatPhMobile(known.mobile) : "",
    consent: false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<SubmissionError | null>(null);
  const [done, setDone] = useState<{ reference: string; via: SentVia } | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    const next = { ...form, [key]: value };
    setForm(next);
    if (attempted) setErrors((prev) => ({ ...validate(next), file: prev.file }));
  };

  async function pickFile(f: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (!f) {
      setFile(null);
      setErrors((e) => ({ ...e, file: attempted ? "Please attach a screenshot or photo of your payment receipt." : undefined }));
      return;
    }
    const problem = await validateReceiptFile(f);
    if (problem) {
      setFile(null);
      setErrors((e) => ({ ...e, file: problem }));
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setFile(f);
    setErrors((e) => ({ ...e, file: undefined }));
    if (f.type.startsWith("image/") && f.type !== "image/heic" && f.type !== "image/heif") setPreview(URL.createObjectURL(f));
  }

  const phoneMode = services.deliveryMode === "phone";
  // The receipt message being sent from the customer's phone (phone mode, or as a backup after a service error).
  const [phoneReceipt, setPhoneReceipt] = useState<{ reference: string; message: OutgoingMessage } | null>(null);
  const [lastReceipt, setLastReceipt] = useState<{ reference: string; message: OutgoingMessage } | null>(null);
  const phonePanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phoneReceipt) phonePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [phoneReceipt]);

  function finish(reference: string, via: SentVia) {
    markReceiptSent(reference, via);
    setDone({ reference, via });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (submitting || honeypot) return;
    setAttempted(true);
    // In phone mode the screenshot is attached in the customer's chat, so picking it here is optional.
    const fileError = file || !phoneMode ? await validateReceiptFile(file) : null;
    const found: Errors = { ...validate(form), file: fileError ?? undefined };
    setErrors(found);
    const first = (Object.keys(found) as (keyof Errors)[]).find((k) => found[k]);
    if (first) {
      formRef.current?.querySelector<HTMLElement>(first === "method" ? "[name=method-gcash]" : `#${first}`)?.focus();
      return;
    }
    const reference = normalizeReference(form.reference);
    const receipt = {
      reference,
      method: form.method as PaymentMethod,
      transactionReference: form.transactionReference.trim().toUpperCase(),
      amountPaid: parseAmount(form.amount)!,
      booking: known?.reference === reference ? known : null,
      mobile: normalizePhMobile(form.mobile) ?? "",
    };
    setLastReceipt({ reference, message: receiptMessage(receipt) });
    if (phoneMode) {
      setPhoneReceipt({ reference, message: receiptMessage(receipt) });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPaymentReceipt({ ...receipt, file: file!, submittedAt: nowStamp() });
      finish(reference, "service");
    } catch (err) {
      setError(err instanceof SubmissionError ? err : new SubmissionError("network", "Something went wrong. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const byPhone = done.via === "phone";
    const viewParams = known ? bookingToParams(known) : null;
    if (viewParams && params.get("via") === "phone") viewParams.set("via", "phone");
    return (
      <div className="container max-w-2xl py-10 sm:py-14">
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-primary" aria-hidden="true" />
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {byPhone ? "Payment details sent" : "Payment details submitted"}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {byPhone ? "You sent your payment details and receipt for " : "We received your payment details and receipt for "}
            <span className="font-mono font-bold text-foreground">{done.reference}</span>.
            {byPhone && " The facility will reply to let you know they received it."}
          </p>
          <div className="mt-4 flex justify-center"><StatusBadge status="payment_submitted" /></div>
        </div>
        <Alert variant="info" className="mt-8">
          <AlertTriangle />
          <AlertTitle>Your booking is not confirmed yet</AlertTitle>
          <AlertDescription>
            Staff will check that the payment actually arrived in our GCash or bank account and that the court is still
            available. You'll receive a confirmation by SMS or email. If the slot is unavailable, your payment will be
            refunded in full.
          </AlertDescription>
        </Alert>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {viewParams && known?.reference === done.reference && (
            <Button asChild size="lg" variant="outline"><Link to={`/booking/submitted?${viewParams}`}>View booking request</Link></Button>
          )}
          <Button asChild size="lg" className={cn(known?.reference !== done.reference && "sm:col-span-2")}><Link to="/">Back to home</Link></Button>
        </div>
        <ContactCard reference={done.reference} className="mt-8" />
      </div>
    );
  }

  const amountNum = parseAmount(form.amount);
  const amountMismatch = known && amountNum != null && normalizeReference(form.reference) === known.reference && amountNum !== known.fee.total;
  const alreadySent = normalizeReference(form.reference) in receiptSentFor;

  return (
    <>
      <PageHeader
        eyebrow="Payment"
        title={phoneMode ? "Send your payment receipt" : "Submit your payment receipt"}
        description={
          phoneMode
            ? "Paid through GCash or bank transfer? Fill this in and we'll write the message for you to send from your phone, with your receipt screenshot."
            : "Paid through GCash or bank transfer? Send us the transaction reference and a screenshot so staff can verify it."
        }
      />
      <div className="container grid gap-8 py-8 lg:grid-cols-[1fr_380px]">
        <form ref={formRef} onSubmit={submit} noValidate className="space-y-6" aria-label="Payment receipt">
          {alreadySent && (
            <Alert variant="info">
              <CheckCircle2 />
              <AlertTitle>You already sent a receipt for this booking</AlertTitle>
              <AlertDescription>Only send another one if staff asked you to, or for an additional payment.</AlertDescription>
            </Alert>
          )}
          {attempted && Object.values(errors).some(Boolean) && (
            <Alert variant="destructive" role="alert">
              <AlertTriangle />
              <AlertTitle>Please check the highlighted fields</AlertTitle>
            </Alert>
          )}

          <Card>
            <CardContent className="space-y-5 pt-5 sm:pt-6">
              <Field id="reference" label="Booking reference" required error={errors.reference} hint="Shown after you submitted your booking request.">
                <Input
                  {...fieldAria("reference", errors.reference, true)}
                  value={form.reference}
                  onChange={(e) => set("reference", e.target.value.toUpperCase())}
                  placeholder={EXAMPLE_REFERENCE}
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono uppercase tracking-wide"
                  maxLength={20}
                />
              </Field>

              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold">
                  Payment method <span className="text-destructive" aria-hidden="true">*</span>
                </legend>
                <div
                  role="radiogroup"
                  aria-label="Payment method"
                  aria-invalid={errors.method ? true : undefined}
                  className="grid grid-cols-2 gap-2"
                  onKeyDown={(e) => handleChoiceKeys(e)}
                >
                  {([
                    { value: "gcash", label: payment.gcash.label, icon: Smartphone },
                    { value: "bank", label: payment.bank.label, icon: Landmark },
                  ] as const).map((m, i) => {
                    const selected = form.method === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        role="radio"
                        name={`method-${m.value}`}
                        aria-checked={selected}
                        tabIndex={rovingTabIndex(selected, form.method !== "", i === 0)}
                        onClick={() => set("method", m.value)}
                        className={cn(
                          "flex h-14 items-center justify-center gap-2 rounded-[10px] border-2 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/60",
                          errors.method && !selected && "border-destructive",
                        )}
                      >
                        <m.icon className="h-5 w-5" aria-hidden="true" /> {m.label}
                      </button>
                    );
                  })}
                </div>
                {errors.method && <p className="text-sm font-medium text-destructive">{errors.method}</p>}
              </fieldset>

              <Field
                id="transactionReference"
                label={form.method === "gcash" ? "GCash reference number" : "Transaction reference number"}
                required
                error={errors.transactionReference}
                hint={form.method === "bank" ? payment.bank.referenceHint : payment.gcash.referenceHint}
              >
                <Input
                  {...fieldAria("transactionReference", errors.transactionReference, true)}
                  value={form.transactionReference}
                  onChange={(e) => set("transactionReference", e.target.value)}
                  inputMode={form.method === "gcash" ? "numeric" : "text"}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono tracking-wide"
                  maxLength={40}
                />
              </Field>

              <Field id="amount" label="Amount paid (₱)" required error={errors.amount} hint={known ? `Your booking total is ${formatPeso(known.fee.total)}.` : undefined}>
                <Input
                  {...fieldAria("amount", errors.amount, Boolean(known))}
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  maxLength={12}
                />
              </Field>
              {amountMismatch && (
                <p className="-mt-3 flex gap-2 rounded-lg bg-warning p-3 text-sm text-warning-foreground">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  This differs from your booking total of {formatPeso(known!.fee.total)}. You can still submit - staff will contact you about the difference.
                </p>
              )}

              <Field id="mobile" label="Mobile number used for the booking" optional error={errors.mobile} hint="Helps staff match your receipt faster.">
                <Input
                  {...fieldAria("mobile", errors.mobile, true)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.mobile}
                  onChange={(e) => set("mobile", e.target.value)}
                  placeholder="0917 123 4567"
                  maxLength={20}
                />
              </Field>

              <div className="space-y-2">
                <Label htmlFor="file" className="flex items-baseline gap-1.5">
                  Receipt screenshot or photo
                  {phoneMode ? (
                    <span className="text-xs font-medium text-muted-foreground">(optional here - you can attach it in your chat)</span>
                  ) : (
                    <span className="text-destructive" aria-hidden="true">*</span>
                  )}
                </Label>
                <input
                  ref={fileInput}
                  id="file"
                  type="file"
                  accept={receiptUpload.acceptAttr}
                  className="sr-only"
                  aria-invalid={errors.file ? true : undefined}
                  aria-describedby={errors.file ? "file-error" : "file-hint"}
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <div className="flex items-center gap-3 rounded-xl border bg-background p-3">
                    {preview ? (
                      <img src={preview} alt="Preview of your receipt" className="h-20 w-16 rounded-md border object-cover" />
                    ) : (
                      <span className="flex h-20 w-16 items-center justify-center rounded-md border bg-muted"><FileText className="h-6 w-6 text-muted-foreground" /></span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                      <button type="button" onClick={() => fileInput.current?.click()} className="mt-1 text-xs font-semibold text-primary underline-offset-2 hover:underline">
                        Choose a different file
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove file"
                      onClick={() => {
                        if (fileInput.current) fileInput.current.value = "";
                        pickFile(null);
                      }}
                    >
                      <X />
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="file"
                    className={cn(
                      "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-background p-6 text-center transition-colors hover:border-primary hover:bg-secondary/50",
                      errors.file ? "border-destructive" : "border-input",
                    )}
                  >
                    <ImagePlus className="h-8 w-8 text-primary" aria-hidden="true" />
                    <span className="font-semibold">Tap to choose from your photos</span>
                    <span className="text-xs text-muted-foreground">{receiptUpload.acceptedLabel}</span>
                  </label>
                )}
                {errors.file ? (
                  <p id="file-error" className="text-sm font-medium text-destructive">{errors.file}</p>
                ) : (
                  <p id="file-hint" className="text-xs text-muted-foreground">
                    Make sure the amount, date, reference number and recipient name are visible.{" "}
                    {phoneMode
                      ? "On most phones it's attached to your message automatically. Nothing is uploaded to this website."
                      : "Sent securely to our staff - not stored on this device."}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consent"
                    checked={form.consent}
                    onCheckedChange={(v) => set("consent", v === true)}
                    aria-invalid={errors.consent ? true : undefined}
                    aria-describedby={errors.consent ? "consent-error" : undefined}
                    className="mt-0.5"
                  />
                  <Label htmlFor="consent" className="text-sm font-normal leading-relaxed">
                    I confirm these payment details are accurate and agree that {facility.name} may use them to verify my
                    booking (see the{" "}
                    <Link to="/privacy" target="_blank" className="font-semibold text-primary underline underline-offset-2">privacy notice</Link>).{" "}
                    <span className="text-destructive" aria-hidden="true">*</span>
                  </Label>
                </div>
                {errors.consent && <p id="consent-error" className="text-sm font-medium text-destructive">{errors.consent}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Honeypot */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label>
              Leave this empty
              <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </label>
          </div>

          {error && (
            <Alert variant="destructive" role="alert">
              <AlertTriangle />
              <AlertTitle>{error.kind === "timeout" ? "We didn't get a response in time" : "Your receipt was not submitted"}</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{error.message}</p>
                <p>Your form is still filled in, so you can try again - or send it from your phone instead.</p>
                {lastReceipt && !phoneReceipt && (
                  <Button type="button" variant="outline" className="bg-card" onClick={() => setPhoneReceipt(lastReceipt)}>
                    <Smartphone /> Send from my phone instead
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          <p className="text-xs text-muted-foreground">
            A receipt is not proof of payment. Staff verify every transfer against our GCash/bank records before confirming.
          </p>

          {phoneReceipt ? (
            <div ref={phonePanelRef} className="scroll-mt-24">
              <SendViaPhone
                message={phoneReceipt.message}
                file={file}
                sentLabel="I've sent my receipt"
                title={phoneMode ? "Send your receipt" : "Send it from your phone instead"}
                onSent={() => finish(phoneReceipt.reference, "phone")}
              />
            </div>
          ) : (
            <Button type="submit" size="xl" className="w-full sm:w-auto" disabled={submitting} aria-busy={submitting}>
              {submitting ? (
                <><Loader2 className="animate-spin" /> Uploading receipt…</>
              ) : error ? (
                <><RefreshCw /> Try again</>
              ) : phoneMode ? (
                <><Smartphone /> Continue to send receipt</>
              ) : (
                <><Upload /> Submit payment receipt</>
              )}
            </Button>
          )}
        </form>

        <aside className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Haven't paid yet?</CardTitle>
              <CardDescription>Use one of these accounts, then come back to send your receipt.</CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentInstructions
                amount={known?.fee.total}
                reference={known?.reference}
                method={form.method || "gcash"}
                onMethodChange={(m) => set("method", m)}
              />
            </CardContent>
          </Card>
          <ContactCard reference={normalizeReference(form.reference) || undefined} />
        </aside>
      </div>
    </>
  );
}
