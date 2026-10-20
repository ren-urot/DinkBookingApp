import { Link } from "react-router-dom";
import {
  CalendarDays,
  CircleCheck,
  Clock,
  CreditCard,
  ExternalLink,
  Home,
  Mail,
  MapPin,
  MessageCircle,
  MousePointerClick,
  Phone,
  Send,
  ShieldCheck,
  Sun,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { addOns, courts, peakWindows, type Court } from "@/config/courts";
import { bookingRules, facility, type Weekday } from "@/config/facility";
import { cancellationPolicy } from "@/config/policies";
import { getHoursForDay } from "@/lib/schedule";
import { formatPeso } from "@/lib/pricing";
import { formatTime, toMinutes, weekdayNames } from "@/lib/time";
import { cn } from "@/lib/utils";

const weekOrder: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

/** "A", "A and B", "A, B and C". */
function joinList(items: string[]): string {
  return items.length <= 2 ? items.join(" and ") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function formatHours(h: { open: string; close: string } | null) {
  return h ? `${formatTime(toMinutes(h.open))} - ${formatTime(toMinutes(h.close))}` : "Closed";
}

/** Compresses identical consecutive days, e.g. "Mon-Fri 6:00 AM - 10:00 PM". */
export function summarizeHours(court?: Court): { days: string; hours: string }[] {
  const rows: { from: Weekday; to: Weekday; hours: string }[] = [];
  for (const day of weekOrder) {
    const hours = formatHours(getHoursForDay(court, day));
    const last = rows[rows.length - 1];
    if (last && last.hours === hours) last.to = day;
    else rows.push({ from: day, to: day, hours });
  }
  const short = (d: Weekday) => weekdayNames[d].slice(0, 3);
  return rows.map((r) => ({ days: r.from === r.to ? short(r.from) : `${short(r.from)}-${short(r.to)}`, hours: r.hours }));
}

export function CourtTypeBadge({ type }: { type: Court["type"] }) {
  return type === "indoor" ? (
    <Badge variant="secondary"><Home /> Indoor</Badge>
  ) : (
    <Badge variant="ball"><Sun /> Outdoor</Badge>
  );
}

export function CourtCard({ court }: { court: Court }) {
  const schedule = summarizeHours(court);
  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative aspect-video overflow-hidden bg-muted">
        <img src={court.image} alt={court.imageAlt} className="h-full w-full object-cover" loading="lazy" width={640} height={360} />
        <div className="absolute left-3 top-3">
          <CourtTypeBadge type={court.type} />
        </div>
      </div>
      <CardHeader className="pb-3">
        <CardTitle>{court.name}</CardTitle>
        <CardDescription>{court.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {court.features.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Court features">
            {court.features.map((f) => (
              <li key={f} className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{f}</li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-2 gap-3 rounded-lg border bg-background p-3">
          <div>
            <p className="text-xs text-muted-foreground">Standard</p>
            <p className="text-lg font-extrabold">{formatPeso(court.rate)}<span className="text-xs font-medium text-muted-foreground"> /hr</span></p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Peak</p>
            <p className="text-lg font-extrabold">{formatPeso(court.peakRate)}<span className="text-xs font-medium text-muted-foreground"> /hr</span></p>
          </div>
        </div>
        <div className="flex gap-2 text-sm">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <dl className="space-y-0.5">
            {schedule.map((row) => (
              <div key={row.days} className="flex gap-2">
                <dt className="w-16 shrink-0 font-semibold">{row.days}</dt>
                <dd className="text-muted-foreground">{row.hours}</dd>
              </div>
            ))}
          </dl>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild size="lg" className="w-full">
          <Link to={`/book?court=${court.id}`}>Book This Court</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function RatesTable({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <table className="w-full text-sm">
        <caption className="sr-only">Hourly court rental rates</caption>
        <thead className="bg-muted text-left">
          <tr>
            <th scope="col" className="px-4 py-3 font-bold">Court</th>
            <th scope="col" className="px-4 py-3 text-right font-bold">Standard /hr</th>
            <th scope="col" className="px-4 py-3 text-right font-bold">Peak /hr</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {courts.map((c) => (
            <tr key={c.id}>
              <th scope="row" className="px-4 py-3 text-left font-semibold">
                <span className="block">{c.name}</span>
                <span className="text-xs font-medium capitalize text-muted-foreground">{c.type}</span>
              </th>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatPeso(c.rate)}</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatPeso(c.peakRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="space-y-1 border-t bg-background px-4 py-3 text-xs text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">Peak hours:</span> {peakWindows.map((w) => w.label).join(" · ")}
        </p>
        <p>Billed in 30-minute blocks. Minimum booking {Math.min(...bookingRules.durationOptions) / 60} hour.</p>
      </div>
    </div>
  );
}

export function AddOnsList() {
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {addOns.map((a) => (
        <li key={a.name} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
          <div>
            <p className="font-semibold">{a.name}</p>
            <p className="text-xs text-muted-foreground">{a.note}</p>
          </div>
          <p className="shrink-0 font-semibold">{a.price}</p>
        </li>
      ))}
    </ul>
  );
}

export function HoursTable({ className }: { className?: string }) {
  const outdoor = courts.find((c) => c.type === "outdoor" && c.hours);
  const outdoorDiffers =
    outdoor && JSON.stringify(summarizeHours(outdoor)) !== JSON.stringify(summarizeHours());
  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <dl className="divide-y text-sm">
        {weekOrder.map((d) => (
          <div key={d} className="flex justify-between gap-4 py-2">
            <dt className="font-semibold">{weekdayNames[d]}</dt>
            <dd className="text-muted-foreground">{formatHours(facility.hours[d])}</dd>
          </div>
        ))}
      </dl>
      {outdoorDiffers && (
        <p className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          Outdoor courts: {summarizeHours(outdoor).map((r) => `${r.days} ${r.hours}`).join(", ")}.
        </p>
      )}
      {facility.closedDates.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Closed on {joinList(facility.closedDates.map((d) => new Date(`${d}T00:00:00Z`).toLocaleDateString(facility.locale, { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })))}.
        </p>
      )}
    </div>
  );
}

const steps = [
  { icon: MousePointerClick, title: "Pick a court & time", text: "Choose your court, date, start time and how long you'll play." },
  { icon: Send, title: "Send your request", text: "Enter your name and mobile number - no account needed. You'll get a booking reference." },
  { icon: CreditCard, title: "Pay via GCash or bank", text: `Pay the total within ${bookingRules.paymentWindowHours} hours using the details we show you.` },
  { icon: Upload, title: "Send your receipt", text: "Send your transaction reference and a screenshot of your receipt." },
  { icon: ShieldCheck, title: "We verify & confirm", text: "Staff check the payment and court schedule, then confirm your booking by SMS or email." },
];

export function HowItWorks() {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {steps.map((s, i) => (
        <li key={s.title} className="relative rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">
              {i + 1}
            </span>
            <s.icon className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <h3 className="font-bold">{s.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

export function ContactCard({ reference, className }: { reference?: string; className?: string }) {
  const c = facility.contact;
  // "?&body=" is understood by both Android and iOS.
  const smsBody = reference ? `?&body=${encodeURIComponent(`Hi! Booking reference ${reference}: `)}` : "";
  const mailSubject = reference ? `?subject=${encodeURIComponent(`Booking ${reference}`)}` : "";
  const items = [
    { icon: Phone, label: "Call", value: c.phone, href: `tel:${c.phoneHref}` },
    { icon: MessageCircle, label: "SMS / Viber", value: c.phone, href: `sms:${c.sms}${smsBody}` },
    { icon: Mail, label: "Email", value: c.email, href: `mailto:${c.email}${mailSubject}` },
    { icon: MessageCircle, label: "Messenger", value: "Message us on Facebook", href: c.messengerUrl, external: true },
  ];
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Contact the front desk</CardTitle>
        <CardDescription>Staff reply {c.responseHours}.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2">
          {items.map((it) => (
            <li key={it.label}>
              <a
                href={it.href}
                {...(it.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="flex min-h-12 items-center gap-3 rounded-lg border bg-background px-3 py-2 transition-colors hover:border-primary hover:bg-secondary"
              >
                <it.icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <span className="flex min-w-0 flex-col">
                  <span className="text-xs text-muted-foreground">{it.label}</span>
                  <span className="truncate text-sm font-semibold">{it.value}</span>
                </span>
                {it.external && <ExternalLink className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function LocationCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Location</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <address className="text-sm not-italic">
            <span className="block font-semibold">{facility.name}</span>
            {facility.location.addressLines.map((l) => (
              <span key={l} className="block text-muted-foreground">{l}</span>
            ))}
          </address>
        </div>
        <p className="text-sm text-muted-foreground">{facility.location.directions}</p>
        <Button asChild variant="outline" className="w-full">
          <a href={facility.location.mapsUrl} target="_blank" rel="noopener noreferrer">
            <MapPin /> Open in Google Maps <ExternalLink />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

export function PolicyList({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-4">
      <ul className="grid gap-3 sm:grid-cols-2">
        {(compact ? cancellationPolicy.rules.slice(0, 3) : cancellationPolicy.rules).map((r) => (
          <li key={r.title} className="flex gap-3 rounded-xl border bg-card p-4">
            <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="font-bold">{r.title}</p>
              <p className="text-sm text-muted-foreground">{r.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      {!compact && (
        <div className="space-y-2 rounded-xl border bg-muted/60 p-4 text-sm">
          <p><span className="font-semibold">Refunds: </span>{cancellationPolicy.refundProcess}</p>
          <p><span className="font-semibold">How to cancel: </span>{cancellationPolicy.howToCancel}</p>
        </div>
      )}
    </div>
  );
}

export function AvailabilityNotice({ className }: { className?: string }) {
  return (
    <p className={cn("flex gap-2 text-xs text-muted-foreground", className)}>
      <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Time slots show our opening hours. Your booking is a request until staff check the schedule, verify your payment and confirm it.
    </p>
  );
}
