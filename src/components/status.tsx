import { Ban, CheckCircle2, Circle, CircleDot, Clock, Search, Send, Upload, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { glossaryStatuses, staffUpdatedStatuses, statusFlow, statusInfo, type BookingStatus } from "@/config/statuses";
import { services } from "@/config/services";
import { cn } from "@/lib/utils";

const icons: Record<BookingStatus, typeof Circle> = {
  request_submitted: Send,
  request_sent: Send,
  awaiting_payment: Clock,
  payment_submitted: Upload,
  under_verification: Search,
  confirmed: CheckCircle2,
  unavailable: XCircle,
  cancelled: Ban,
};

const toneVariant = {
  neutral: "secondary",
  pending: "warning",
  progress: "info",
  success: "success",
  danger: "destructive",
} as const;

export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  const info = statusInfo[status];
  const Icon = icons[status];
  return (
    <Badge variant={toneVariant[info.tone]} className={cn("px-3 py-1 text-sm [&_svg]:size-4", className)}>
      <Icon aria-hidden="true" /> {info.label}
    </Badge>
  );
}

/**
 * Shows where a booking is in the normal flow. Steps after `current` are
 * explicitly labelled as pending staff action so the page never implies
 * a status change that hasn't happened.
 */
export function StatusTimeline({ current, sentByPhone = services.deliveryMode === "phone" }: {
  current: BookingStatus;
  /** The request went out from the customer's phone, so nothing confirms it arrived until staff reply. */
  sentByPhone?: boolean;
}) {
  const flow: BookingStatus[] = [sentByPhone ? "request_sent" : "request_submitted", ...statusFlow.slice(1)];
  const staffUpdated = (s: BookingStatus) => staffUpdatedStatuses.has(s) || (sentByPhone && s === "awaiting_payment");
  const terminal = current === "unavailable" || current === "cancelled";
  const currentIndex = terminal ? -1 : flow.indexOf(current);
  return (
    <ol className="space-y-0" aria-label="Booking progress">
      {flow.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const Icon = done ? CheckCircle2 : active ? CircleDot : Circle;
        return (
          <li key={s} className="relative flex gap-3 pb-5 last:pb-0" aria-current={active ? "step" : undefined}>
            {i < flow.length - 1 && (
              <span
                className={cn("absolute left-[11px] top-7 h-[calc(100%-1.75rem)] w-0.5", done ? "bg-primary" : "bg-border")}
                aria-hidden="true"
              />
            )}
            <Icon
              className={cn(
                "relative z-10 h-6 w-6 shrink-0 bg-card",
                done || active ? "text-primary" : "text-muted-foreground/50",
              )}
              aria-hidden="true"
            />
            <div className="-mt-0.5">
              <p className={cn("font-bold", !done && !active && "text-muted-foreground")}>
                {statusInfo[s].label}
                {active && <span className="sr-only"> (current status)</span>}
                {done && <span className="sr-only"> (completed)</span>}
              </p>
              <p className="text-sm text-muted-foreground">{statusInfo[s].description}</p>
              {i > currentIndex && staffUpdated(s) && !terminal && (
                <p className="mt-0.5 text-xs font-medium text-muted-foreground/80">Updated by staff</p>
              )}
            </div>
          </li>
        );
      })}
      {terminal && (
        <li className="mt-4 flex gap-3 rounded-lg bg-red-50 p-3">
          <XCircle className="h-6 w-6 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-bold text-red-900">{statusInfo[current].label}</p>
            <p className="text-sm text-red-900/80">{statusInfo[current].description}</p>
          </div>
        </li>
      )}
    </ol>
  );
}

export function StatusGlossary() {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {glossaryStatuses.map((s) => (
        <div key={s} className="rounded-xl border bg-card p-3">
          <dt><StatusBadge status={s} /></dt>
          <dd className="mt-2 text-sm text-muted-foreground">{statusInfo[s].description}</dd>
        </div>
      ))}
    </dl>
  );
}
