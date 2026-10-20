import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarPlus,
  Check,
  ClipboardPaste,
  Copy,
  ExternalLink,
  Loader2,
  Lock,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/common";
import { courts, getCourt, type Court } from "@/config/courts";
import { facility } from "@/config/facility";
import { services } from "@/config/services";
import { adminApi, AdminError, type AdminStatus, type NewBooking, type SheetRow } from "@/lib/admin";
import { matchCourt, parseSheetDate, parseSheetTime } from "@/lib/bookedSheet";
import { clearBookedSheetCache } from "@/lib/external";
import { parseBookingMessage } from "@/lib/message";
import { facilityNow, formatDate, formatTime, toHHMM } from "@/lib/time";
import { cn } from "@/lib/utils";

/**
 * Staff-only page (not linked from the site). Reads and updates the
 * booked-slots Google Sheet through the PIN-protected Apps Script.
 */

interface ParsedRow {
  raw: SheetRow;
  court?: Court;
  date?: string;
  start?: number;
  end?: number;
  status: AdminStatus | "Other";
}

function parseRow(raw: SheetRow): ParsedRow {
  const start = parseSheetTime(raw.start) ?? undefined;
  let end = parseSheetTime(raw.end) ?? undefined;
  if (end === 0) end = 24 * 60;
  const s = raw.status.toLowerCase();
  const status: ParsedRow["status"] = /cancel|releas|void/.test(s)
    ? "Cancelled"
    : /confirm|paid/.test(s)
      ? "Confirmed"
      : /held|hold|pending|^$/.test(s)
        ? "Held"
        : "Other";
  return { raw, court: matchCourt(raw.court), date: parseSheetDate(raw.date) ?? undefined, start, end, status };
}

const isActive = (r: ParsedRow) => r.status !== "Cancelled";

function overlaps(a: ParsedRow, court: Court, date: string, start: number, end: number) {
  return isActive(a) && a.court?.id === court.id && a.date === date && a.start != null && a.end != null && start < a.end && end > a.start;
}

function confirmationText(r: ParsedRow) {
  const when = r.date && r.start != null && r.end != null ? `${formatDate(r.date, "medium")}, ${formatTime(r.start)} - ${formatTime(r.end)}` : `${r.raw.date} ${r.raw.start}-${r.raw.end}`;
  const ref = r.raw.reference ? ` ${r.raw.reference}` : "";
  return `Hi! Your booking${ref} is CONFIRMED: ${r.court?.name ?? r.raw.court}, ${when}. Please arrive 10 minutes early. See you on the court! - ${facility.shortName}`;
}

export default function AdminPage() {
  const [pin, setPin] = useState<string | null>(null);
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Keep this page out of search engines.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    document.title = `Admin - ${facility.name}`;
    return () => meta.remove();
  }, []);

  async function reload(currentPin = pin) {
    if (!currentPin) return;
    setLoading(true);
    setLoadError(null);
    try {
      setRows(await adminApi.list(currentPin));
    } catch (err) {
      const e = err as AdminError;
      if (e.code === "auth" || e.code === "locked") {
        setPin(null);
        toast.error(e.message);
      } else setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function afterWrite() {
    clearBookedSheetCache();
    return reload();
  }

  if (!services.adminScriptUrl) return <SetupNotice />;
  if (!pin) return <PinGate onUnlock={(p, list) => { setPin(p); setRows(list); }} />;

  const parsed = rows.map(parseRow);

  return (
    <div className="container max-w-5xl space-y-6 py-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Staff only</p>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Bookings admin</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => reload()} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />} Refresh
          </Button>
          {services.bookedSheetEditUrl && (
            <Button asChild variant="outline">
              <a href={services.bookedSheetEditUrl} target="_blank" rel="noopener noreferrer">
                Open Google Sheet <ExternalLink />
              </a>
            </Button>
          )}
          <Button variant="ghost" onClick={() => { setPin(null); setRows([]); }}>
            <Lock /> Lock
          </Button>
        </div>
      </div>

      {loadError && (
        <Alert variant="destructive" role="alert">
          <AlertTriangle />
          <AlertTitle>Couldn't load the schedule</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <AddBookingCard pin={pin} rows={parsed} onSaved={afterWrite} />
        <BookingList pin={pin} rows={parsed} onSaved={afterWrite} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function SetupNotice() {
  return (
    <div className="container max-w-xl py-12">
      <Alert variant="warning">
        <AlertTriangle />
        <AlertTitle>The admin page isn't connected yet</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            Install the admin script in the booked-slots Google Sheet and add its web-app link to Vercel as{" "}
            <code className="rounded bg-white/60 px-1">VITE_ADMIN_SCRIPT_URL</code>. The README's "Admin page" section has the steps.
          </p>
          {services.bookedSheetEditUrl && (
            <p>
              Meanwhile you can{" "}
              <a className="font-semibold underline" href={services.bookedSheetEditUrl} target="_blank" rel="noopener noreferrer">
                edit the Google Sheet directly
              </a>
              .
            </p>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}

function PinGate({ onUnlock }: { onUnlock: (pin: string, rows: SheetRow[]) => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      onUnlock(value.trim(), await adminApi.list(value.trim()));
    } catch (err) {
      setError((err as AdminError).message);
      setBusy(false);
    }
  }

  return (
    <div className="container flex justify-center py-12 sm:py-20">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <ShieldCheck className="mx-auto mb-2 h-10 w-10 text-primary" aria-hidden="true" />
          <CardTitle>Staff sign-in</CardTitle>
          <CardDescription>Enter the admin PIN to manage bookings.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Field id="pin" label="Admin PIN" error={error ?? undefined}>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "pin-error" : undefined}
              />
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={busy || !value.trim()}>
              {busy ? <Loader2 className="animate-spin" /> : <Lock />} Unlock
            </Button>
            <p className="text-center text-xs text-muted-foreground">The PIN is checked by Google and never saved on this device.</p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------------- */

const timeOptions = Array.from({ length: 37 }, (_, i) => 6 * 60 + i * 30); // 6:00 AM - 12:00 AM
const selectClass =
  "flex h-12 w-full rounded-lg border border-input bg-card px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function AddBookingCard({ pin, rows, onSaved }: { pin: string; rows: ParsedRow[]; onSaved: () => Promise<void> }) {
  const today = facilityNow().date;
  const [message, setMessage] = useState("");
  const [courtId, setCourtId] = useState(courts[0].id);
  const [date, setDate] = useState(today);
  const [start, setStart] = useState(18 * 60);
  const [end, setEnd] = useState(19 * 60);
  const [status, setStatus] = useState<NewBooking["status"]>("Held");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);

  function fillFromMessage(text: string) {
    const p = parseBookingMessage(text);
    const found = Object.keys(p).length;
    if (!found) {
      toast.error("Couldn't find booking details in that text.");
      return;
    }
    if (p.courtId) setCourtId(p.courtId);
    if (p.date) setDate(p.date);
    if (p.start != null) setStart(p.start);
    if (p.end != null) setEnd(p.end);
    if (p.reference) setReference(p.reference);
    toast.success(`Filled in ${found} field${found === 1 ? "" : "s"} from the message. Check them before saving.`);
  }

  const court = getCourt(courtId)!;
  const clash = end > start ? rows.find((r) => overlaps(r, court, date, start, end)) : undefined;

  async function save(force = false) {
    if (end <= start) {
      setError(new AdminError("invalid", "End time must be after the start time."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminApi.add(pin, { court: court.code, date, start: toHHMM(start), end: toHHMM(end), status, reference: reference.trim().toUpperCase(), force });
      toast.success(`${status === "Held" ? "Held" : "Confirmed"}: ${court.code} ${formatDate(date, "short")} ${formatTime(start)}. It's now blocked on the website.`);
      setMessage("");
      setReference("");
      await onSaved();
    } catch (err) {
      setError(err as AdminError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="h-fit lg:sticky lg:top-24">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarPlus className="h-5 w-5 text-primary" aria-hidden="true" /> Add a booking
        </CardTitle>
        <CardDescription>Paste the customer's booking message, or fill it in yourself.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="paste">Customer's message</Label>
          <Textarea
            id="paste"
            rows={3}
            placeholder={"BOOKING REQUEST DD-...\nCourt: ...\nDate: ...\nTime: ..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (/BOOKING REQUEST/i.test(text)) setTimeout(() => fillFromMessage(text), 0);
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => fillFromMessage(message)} disabled={!message.trim()}>
            <ClipboardPaste /> Fill in from message
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="court">Court</Label>
            <select id="court" className={selectClass} value={courtId} onChange={(e) => setCourtId(e.target.value)}>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="start">Start</Label>
            <select id="start" className={selectClass} value={start} onChange={(e) => setStart(Number(e.target.value))}>
              {timeOptions.slice(0, -1).map((t) => (
                <option key={t} value={t}>{formatTime(t)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">End</Label>
            <select id="end" className={selectClass} value={end} onChange={(e) => setEnd(Number(e.target.value))}>
              {timeOptions.slice(1).map((t) => (
                <option key={t} value={t}>{t === 24 * 60 ? "12:00 AM (midnight)" : formatTime(t)}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="reference">Booking reference <span className="text-xs font-medium text-muted-foreground">(optional)</span></Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value.toUpperCase())}
              placeholder="DD-261020-7KQ3P"
              className="font-mono uppercase"
              maxLength={24}
              autoComplete="off"
            />
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Status</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["Held", "Confirmed"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className={cn(
                  "h-11 rounded-[10px] border-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  status === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/60",
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Held = waiting for payment. Confirmed = payment verified.</p>
        </fieldset>

        {end <= start && <p className="text-sm font-medium text-destructive">End time must be after the start time.</p>}
        {clash && (
          <p className="flex gap-2 rounded-lg bg-warning p-3 text-sm text-warning-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Overlaps {clash.raw.status || "a booking"} {clash.raw.reference && <span className="font-mono">{clash.raw.reference}</span>} ({clash.raw.start} - {clash.raw.end}).
          </p>
        )}
        {error && (
          <Alert variant="destructive" role="alert">
            <AlertTriangle />
            <AlertTitle>Not saved</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{error.message}</p>
              {error.code === "conflict" && (
                <Button type="button" variant="outline" size="sm" className="bg-card" onClick={() => save(true)} disabled={busy}>
                  Save anyway (double booking)
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Button type="button" size="lg" className="w-full" onClick={() => save()} disabled={busy || end <= start}>
          {busy ? <Loader2 className="animate-spin" /> : <Check />} Add to schedule
        </Button>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------------- */

type Filter = "upcoming" | "today" | "all";

function BookingList({ pin, rows, onSaved }: { pin: string; rows: ParsedRow[]; onSaved: () => Promise<void> }) {
  const today = facilityNow().date;
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [query, setQuery] = useState("");
  const [busyRow, setBusyRow] = useState<number | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<number | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toUpperCase();
    return rows
      .filter((r) => (filter === "all" ? true : filter === "today" ? r.date === today : !r.date || r.date >= today))
      .filter((r) => !q || r.raw.reference.toUpperCase().includes(q) || (r.court?.code ?? r.raw.court).toUpperCase().includes(q))
      .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || (a.start ?? 0) - (b.start ?? 0));
  }, [rows, filter, query, today]);

  const groups = useMemo(() => {
    const map = new Map<string, ParsedRow[]>();
    for (const r of visible) {
      const key = r.date ?? `?${r.raw.date}`;
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return [...map.entries()];
  }, [visible]);

  async function change(r: ParsedRow, status: AdminStatus) {
    setBusyRow(r.raw.row);
    setConfirmCancel(null);
    try {
      await adminApi.setStatus(pin, r.raw, status);
      if (status === "Confirmed") {
        toast.success("Confirmed. The customer's page now shows Confirmed.", {
          action: { label: "Copy message", onClick: () => copy(confirmationText(r)) },
          duration: 10000,
        });
      } else toast.success(status === "Cancelled" ? "Cancelled. The time is open again." : "Restored as Held.");
      await onSaved();
    } catch (err) {
      toast.error((err as AdminError).message);
      if ((err as AdminError).code === "stale") await onSaved();
    } finally {
      setBusyRow(null);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message copied - paste it to the customer.");
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.");
    }
  }

  const counts = {
    held: rows.filter((r) => r.status === "Held" && (!r.date || r.date >= today)).length,
    confirmed: rows.filter((r) => r.status === "Confirmed" && (!r.date || r.date >= today)).length,
  };

  return (
    <section aria-labelledby="bookings-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="bookings-heading" className="text-lg font-bold">Schedule</h2>
          <p className="text-sm text-muted-foreground">
            {counts.held} waiting for payment · {counts.confirmed} confirmed (upcoming)
          </p>
        </div>
        <div role="group" aria-label="Filter" className="flex gap-1 rounded-lg bg-muted p-1">
          {(["upcoming", "today", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "h-9 rounded-md px-3 text-sm font-semibold capitalize transition-colors",
                filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          aria-label="Search by reference or court"
          placeholder="Search reference or court"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {groups.length === 0 && (
        <p className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          No bookings {filter === "today" ? "today" : filter === "upcoming" ? "coming up" : "yet"}.
        </p>
      )}

      {groups.map(([date, items]) => (
        <div key={date} className="space-y-2">
          <h3 className="text-sm font-bold text-muted-foreground">
            {date.startsWith("?") ? `Unreadable date "${date.slice(1)}"` : `${formatDate(date, "long")}${date === today ? " (today)" : ""}`}
          </h3>
          <ul className="space-y-2">
            {items.map((r) => {
              const busy = busyRow === r.raw.row;
              const readable = r.court && r.date && r.start != null && r.end != null;
              return (
                <li
                  key={r.raw.row}
                  className={cn("rounded-xl border bg-card p-3 sm:p-4", r.status === "Cancelled" && "opacity-60")}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold">
                        {r.start != null && r.end != null ? `${formatTime(r.start)} - ${formatTime(r.end)}` : `${r.raw.start} - ${r.raw.end}`}
                        <span className="font-semibold text-muted-foreground"> · {r.court?.name ?? r.raw.court}</span>
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{r.raw.reference || "no reference"} · row {r.raw.row}</p>
                      {!readable && (
                        <p className="mt-1 text-xs font-medium text-amber-700">The website can't read this row - fix it in the Google Sheet.</p>
                      )}
                    </div>
                    <StatusPill status={r.status} raw={r.raw.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.status !== "Confirmed" && r.status !== "Cancelled" && (
                      <Button size="sm" onClick={() => change(r, "Confirmed")} disabled={busy}>
                        {busy ? <Loader2 className="animate-spin" /> : <Check />} Confirm
                      </Button>
                    )}
                    {r.status === "Confirmed" && (
                      <Button size="sm" variant="outline" onClick={() => copy(confirmationText(r))}>
                        <Copy /> Copy message
                      </Button>
                    )}
                    {r.status === "Cancelled" ? (
                      <Button size="sm" variant="outline" onClick={() => change(r, "Held")} disabled={busy}>
                        <RotateCcw /> Restore
                      </Button>
                    ) : confirmCancel === r.raw.row ? (
                      <>
                        <Button size="sm" variant="destructive" onClick={() => change(r, "Cancelled")} disabled={busy}>
                          <X /> Yes, cancel
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmCancel(null)}>
                          Keep
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setConfirmCancel(r.raw.row)} disabled={busy}>
                        <X /> Cancel
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function StatusPill({ status, raw }: { status: ParsedRow["status"]; raw: string }) {
  if (status === "Confirmed") return <Badge variant="success">Confirmed</Badge>;
  if (status === "Cancelled") return <Badge variant="destructive">Cancelled</Badge>;
  if (status === "Held") return <Badge variant="warning">Held · awaiting payment</Badge>;
  return <Badge variant="outline">{raw}</Badge>;
}
