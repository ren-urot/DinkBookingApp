import { AlertTriangle, Info, Landmark, Smartphone } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CopyButton } from "@/components/common";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { payment, type PaymentMethod } from "@/config/payment";
import { formatPeso } from "@/lib/pricing";
import { cn } from "@/lib/utils";

function DetailRow({ label, value, copyValue, copyLabel, mono }: {
  label: string;
  value: string;
  copyValue?: string;
  copyLabel?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("break-words text-base font-bold", mono && "font-mono tracking-wide")}>{value}</p>
      </div>
      {copyValue && <CopyButton value={copyValue} label={copyLabel ?? label} />}
    </div>
  );
}

function AmountRow({ amount, reference }: { amount?: number; reference?: string }) {
  if (amount == null && !reference) return null;
  return (
    <div className="mb-1 grid gap-2 rounded-xl bg-primary p-4 text-primary-foreground sm:grid-cols-2">
      {amount != null && (
        <div className="flex items-center justify-between gap-3 sm:block">
          <div>
            <p className="text-xs font-medium opacity-80">Amount to pay</p>
            <p className="text-2xl font-extrabold tabular-nums">{formatPeso(amount)}</p>
          </div>
          <CopyButton value={String(amount)} label="Amount" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:mt-2" />
        </div>
      )}
      {reference && (
        <div className="flex items-center justify-between gap-3 sm:block">
          <div>
            <p className="text-xs font-medium opacity-80">Put this in the transfer notes</p>
            <p className="font-mono text-lg font-extrabold tracking-wide">{reference}</p>
          </div>
          <CopyButton value={reference} label="Booking reference" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:mt-2" />
        </div>
      )}
    </div>
  );
}

/**
 * GCash and bank transfer instructions. All account details come from
 * config/payment.ts so they are never duplicated across pages.
 */
export function PaymentInstructions({ amount, reference, method, defaultMethod = "gcash", onMethodChange, className }: {
  amount?: number;
  reference?: string;
  /** Pass to control the selected tab; otherwise `defaultMethod` is used. */
  method?: PaymentMethod;
  defaultMethod?: PaymentMethod;
  onMethodChange?: (m: PaymentMethod) => void;
  className?: string;
}) {
  const { gcash, bank } = payment;
  return (
    <div className={className}>
      {payment.isSample && (
        <Alert variant="destructive" role="alert" className="mb-3">
          <AlertTriangle />
          <AlertTitle>Sample payment details - do not send money</AlertTitle>
          <AlertDescription>
            These accounts are placeholders. The facility must replace them in src/config/payment.ts before going live.
          </AlertDescription>
        </Alert>
      )}
      <Tabs
        {...(method ? { value: method } : { defaultValue: defaultMethod })}
        onValueChange={(v) => onMethodChange?.(v as PaymentMethod)}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="gcash"><Smartphone /> GCash</TabsTrigger>
          <TabsTrigger value="bank"><Landmark /> Bank transfer</TabsTrigger>
        </TabsList>

        <TabsContent value="gcash" className="space-y-3">
          <AmountRow amount={amount} reference={reference} />
          <div className="rounded-xl border bg-card px-4">
            <div className="divide-y">
              <DetailRow label="GCash account name" value={gcash.accountName} />
              {gcash.displayName && <DetailRow label="Name shown in GCash app" value={gcash.displayName} mono />}
              <DetailRow
                label="GCash mobile number"
                value={gcash.mobileNumber}
                copyValue={gcash.mobileNumber.replace(/\s/g, "")}
                copyLabel="GCash number"
                mono
              />
            </div>
          </div>
          {gcash.qrImage && (
            <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4">
              <img src={gcash.qrImage} alt={`GCash QR code for ${gcash.accountName}`} className="h-52 w-52 rounded-lg" width={208} height={208} />
              <p className="text-center text-xs text-muted-foreground">
                Scan with the GCash app, or save a screenshot and use "Upload QR".
              </p>
            </div>
          )}
          <ol className="list-decimal space-y-1 rounded-xl bg-muted/60 p-4 pl-8 text-sm">
            <li>Open GCash and tap <strong>Send</strong> → <strong>Express Send</strong> (or scan the QR).</li>
            <li>Enter the number above and check the account name.</li>
            <li>Enter the exact amount{amount != null ? ` (${formatPeso(amount)})` : ""} and send.</li>
            <li>Screenshot the receipt and note the <strong>Ref No.</strong> ({gcash.referenceHint.toLowerCase()}).</li>
          </ol>
        </TabsContent>

        <TabsContent value="bank" className="space-y-3">
          <AmountRow amount={amount} reference={reference} />
          <div className="rounded-xl border bg-card px-4">
            <div className="divide-y">
              <DetailRow label="Bank" value={bank.bankName} />
              <DetailRow label="Account name" value={bank.accountName} copyValue={bank.accountName} copyLabel="Account name" />
              <DetailRow
                label={`Account number (${bank.accountType})`}
                value={bank.accountNumber}
                copyValue={bank.accountNumber.replace(/\s/g, "")}
                copyLabel="Account number"
                mono
              />
              {bank.branch && <DetailRow label="Branch" value={bank.branch} />}
            </div>
          </div>
          <ol className="list-decimal space-y-1 rounded-xl bg-muted/60 p-4 pl-8 text-sm">
            <li>Transfer via your bank app, InstaPay or PESONet.</li>
            <li>Double-check the account name and number.</li>
            <li>Send the exact amount{amount != null ? ` (${formatPeso(amount)})` : ""}.</li>
            <li>Screenshot the receipt and note the reference number ({bank.referenceHint.toLowerCase()}).</li>
          </ol>
        </TabsContent>
      </Tabs>

      <ul className="mt-3 space-y-1.5">
        {payment.notes.map((n) => (
          <li key={n} className="flex gap-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {n}
          </li>
        ))}
      </ul>
    </div>
  );
}
