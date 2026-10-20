import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  Loader2,
  Moon,
  Pencil,
  RefreshCw,
  Send,
  Smartphone,
  Sun,
  Sunrise,
  Users,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Field, fieldAria, handleChoiceKeys, rovingTabIndex, SummaryRow } from "@/components/common";
import { AvailabilityNotice, CourtTypeBadge } from "@/components/facility";
import { SendViaPhone } from "@/components/messaging";
import { courts, getCourt, type Court } from "@/config/courts";
import { bookingRules, facility } from "@/config/facility";
import { services } from "@/config/services";
import { useBooking, type Draft, type SentVia } from "@/context/BookingContext";
import { bookingToParams } from "@/lib/bookingUrl";
import { bookingMessage } from "@/lib/message";
import { fetchAvailability } from "@/lib/external";
import { calculateFee, formatPeso, type FeeBreakdown } from "@/lib/pricing";
import { generateBookingReference } from "@/lib/reference";
import { durationProblem, getBookableDates, getCourtHours, getStartSlots, isSelectionValid, type BookedRange, type StartSlot } from "@/lib/schedule";
import { nowStamp, SubmissionError, submitBookingRequest, type BookingRequest } from "@/lib/submit";
import {
  facilityNow,
  formatDate,
  formatDuration,
  formatDurationShort,
  formatTime,
  formatTimeRange,
  isValidDateString,
} from "@/lib/time";
import { cn } from "@/lib/utils";
import { formatPhMobile, normalizePhMobile, validateDetails, type DetailsErrors, type DetailsInput } from "@/lib/validation";

const STEPS = ["Court", "Date & time", "Your details", "Review"] as const;
type Step = 0 | 1 | 2 | 3;

/** Re-render every minute so past slots disappear without a refresh. */
function useFacilityClock() {
  const [now, setNow] = useState(() => facilityNow());
  useEffect(() => {
    const id = setInterval(() => setNow(facilityNow()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

type Availability = { status: "disabled" | "loading" | "ok" | "error"; booked: BookedRange[] };

function useAvailability(courtId: string | null, date: string | null): Availability {
  const [state, setState] = useState<Availability>({ status: "disabled", booked: [] });
  useEffect(() => {
    if (!courtId || !date || !services.availabilityEndpoint) return;
    const controller = new AbortController();
    // Never reuse another date's reservations while the new ones load.
    setState({ status: "loading", booked: [] });
    fetchAvailability(courtId, date, controller.signal)
      .then((r) => setState(r.status === "ok" ? { status: "ok", booked: r.booked } : { status: r.status, booked: [] }))
      .catch(() => {
        /* aborted */
      });
    return () => controller.abort();
  }, [courtId, date]);
  return state;
}

function maxStepFor(draft: Draft): Step {
  if (!getCourt(draft.courtId)) return 0;
  if (!draft.date || draft.start == null || !draft.duration) return 1;
  if (Object.keys(validateDetails(draft.details)).length > 0) return 2;
  return 3;
}

export default function BookPage() {
  const { draft, updateDraft, resetDraft, setSubmitted } = useBooking();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const now = useFacilityClock();

  // Deep link from a court card: /book?court=court-2 always opens date & time.
  const courtParam = params.get("court");
  useEffect(() => {
    if (!courtParam || !getCourt(courtParam)) return;
    if (courtParam !== draft.courtId) updateDraft({ courtId: courtParam, start: null });
    setParams({ step: "1" }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courtParam]);

  const requested = Number(params.get("step") ?? 0) as Step;
  const step = Math.min(Number.isInteger(requested) && requested >= 0 ? requested : 0, maxStepFor(draft)) as Step;
  const goTo = (s: Step) => {
    setParams({ step: String(s) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Move keyboard/screen-reader focus to the new step (not on first load).
  const stepRef = useRef<HTMLDivElement>(null);
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    stepRef.current?.focus({ preventScroll: true });
  }, [step]);

  const court = getCourt(draft.courtId);
  const availability = useAvailability(court?.id ?? null, draft.date);
  const fee = useMemo(
    () => (court && draft.date && draft.start != null && draft.duration ? calculateFee(court, draft.date, draft.start, draft.duration) : null),
    [court, draft.date, draft.start, draft.duration],
  );

  // Drop a selection that became invalid (time passed, live schedule changed...).
  useEffect(() => {
    if (!court || !draft.date || draft.start == null || !draft.duration) return;
    if (!isSelectionValid(court, draft.date, draft.start, draft.duration, availability.booked, now)) {
      updateDraft({ start: null });
      toast.warning("Your selected time is no longer available to request. Please choose another slot.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, availability.booked]);

  return (
    <div className="container pb-36 pt-6 sm:pt-10 lg:pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Book a court</h1>
        <p className="mt-1 text-sm text-muted-foreground">No account needed. Takes about 2 minutes.</p>
      </div>
      <StepIndicator step={step} maxStep={maxStepFor(draft)} onStep={goTo} />

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div ref={stepRef} tabIndex={-1} aria-label={`Step ${step + 1}: ${STEPS[step]}`} className="min-w-0 outline-none">
          {step === 0 && (
            <CourtStep
              selected={draft.courtId}
              onSelect={(id) => {
                updateDraft({ courtId: id, start: id === draft.courtId ? draft.start : null });
                goTo(1);
              }}
            />
          )}
          {step === 1 && court && (
            <DateTimeStep court={court} draft={draft} updateDraft={updateDraft} availability={availability} now={now} />
          )}
          {step === 2 && (
            <DetailsStep
              details={draft.details}
              onChange={(details) => updateDraft({ details })}
              onBack={() => goTo(1)}
              onNext={() => goTo(3)}
            />
          )}
          {step === 3 && court && fee && (
            <ReviewStep
              court={court}
              draft={draft}
              fee={fee}
              booked={availability.booked}
              onEdit={goTo}
              onSubmitted={(booking, via) => {
                setSubmitted(booking);
                resetDraft();
                const params = bookingToParams(booking);
                // Tells the confirmation page not to claim the service received it.
                if (via === "phone") params.set("via", "phone");
                navigate(`/booking/submitted?${params}`, { replace: true });
              }}
            />
          )}
        </div>

        <aside className="hidden lg:block" aria-label="Booking summary">
          <div className="sticky top-24">
            <SummaryCard court={court} draft={draft} fee={fee} />
          </div>
        </aside>
      </div>

      {step === 1 && (
        <MobileBar
          court={court}
          draft={draft}
          fee={fee}
          actionLabel="Continue"
          disabled={!fee}
          onAction={() => goTo(2)}
          onBack={() => goTo(0)}
        />
      )}
    </div>
  );
}

function StepIndicator({ step, maxStep, onStep }: { step: Step; maxStep: Step; onStep: (s: Step) => void }) {
  return (
    <nav aria-label="Booking progress">
      <p className="mb-2 text-sm font-semibold text-muted-foreground sm:hidden">
        Step {step + 1} of {STEPS.length}: <span className="text-foreground">{STEPS[step]}</span>
      </p>
      <ol className="flex gap-1.5 sm:gap-3">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          const reachable = i <= maxStep && !current;
          return (
            <li key={label} className="flex-1">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onStep(i as Step)}
                aria-current={current ? "step" : undefined}
                className="group flex w-full flex-col gap-2 text-left disabled:cursor-default"
              >
                <span
                  className={cn(
                    "h-1.5 w-full rounded-full transition-colors",
                    done || current ? "bg-primary" : "bg-border",
                  )}
                />
                <span
                  className={cn(
                    "hidden items-center gap-1.5 text-sm font-semibold sm:flex",
                    current ? "text-foreground" : "text-muted-foreground",
                    reachable && "group-hover:text-primary",
                  )}
                >
                  {done ? <Check className="h-4 w-4 text-primary" /> : <span className="tabular-nums">{i + 1}.</span>}
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------------------- */
/* Step 1 - Court                                                            */
/* ------------------------------------------------------------------------- */

function CourtStep({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  return (
    <section aria-labelledby="court-step">
      <h2 id="court-step" className="mb-4 text-xl font-bold">Select a court</h2>
      <div
        role="radiogroup"
        aria-labelledby="court-step"
        className="grid gap-3 sm:grid-cols-2"
        // Choosing a court moves to the next step, so arrows only move focus here.
        onKeyDown={(e) => handleChoiceKeys(e, { select: false })}
      >
        {courts.map((c, i) => {
          const isSelected = selected === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={rovingTabIndex(isSelected, courts.some((x) => x.id === selected), i === 0)}
              onClick={() => onSelect(c.id)}
              className={cn(
                "flex gap-3 rounded-xl border-2 bg-card p-3 text-left transition-all hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected ? "border-primary shadow-md ring-2 ring-primary/20" : "border-border",
              )}
            >
              <img src={c.image} alt="" className="h-20 w-24 shrink-0 rounded-lg object-cover sm:h-24 sm:w-28" width={112} height={96} />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="font-bold leading-tight">{c.name}</span>
                  {isSelected && <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />}
                </span>
                <span><CourtTypeBadge type={c.type} /></span>
                <span className="mt-auto text-sm">
                  <span className="font-extrabold">{formatPeso(c.rate)}</span>
                  <span className="text-muted-foreground">/hr · peak {formatPeso(c.peakRate)}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------- */
/* Step 2 - Date & time                                                      */
/* ------------------------------------------------------------------------- */

function DateTimeStep({ court, draft, updateDraft, availability, now }: {
  court: Court;
  draft: Draft;
  updateDraft: (p: Partial<Draft>) => void;
  availability: Availability;
  now: ReturnType<typeof facilityNow>;
}) {
  const dates = getBookableDates(now);
  const openDates = dates.filter((d) => getStartSlots(court, d, [], now).some((s) => s.state === "available"));
  const date = draft.date && dates.includes(draft.date) ? draft.date : null;

  // Default to the first date that still has open slots.
  useEffect(() => {
    if (!date && openDates[0]) updateDraft({ date: openDates[0], start: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, court.id]);

  const slots = date ? getStartSlots(court, date, availability.booked, now) : [];
  const hours = date ? getCourtHours(court, date) : null;

  function pickSlot(slot: StartSlot) {
    if (!date) return;
    let duration = draft.duration;
    const fits = (d: number) => durationProblem(court, date, slot.start, d, availability.booked) === null;
    if (!duration) duration = fits(60) ? 60 : null;
    else if (!fits(duration)) {
      const fallback = [...bookingRules.durationOptions].reverse().find(fits) ?? null;
      if (fallback) toast.info(`Duration changed to ${formatDuration(fallback)} so it fits before closing or the next booking.`);
      duration = fallback;
    }
    updateDraft({ start: slot.start, duration });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
        <img src={court.image} alt="" className="h-12 w-16 rounded-md object-cover" width={64} height={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{court.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatPeso(court.rate)}/hr · peak {formatPeso(court.peakRate)}/hr
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/book?step=0">Change</Link>
        </Button>
      </div>

      <section aria-labelledby="date-heading">
        <h2 id="date-heading" className="mb-3 flex items-center gap-2 text-lg font-bold">
          <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" /> Choose a date
        </h2>
        <DateStrip
          dates={dates}
          openDates={openDates}
          selected={date}
          today={now.date}
          onSelect={(d) => updateDraft({ date: d, start: d === date ? draft.start : null })}
        />
        {date && (
          <p className="mt-3 text-sm font-semibold" aria-live="polite">
            {formatDate(date, "long")}
            {hours && (
              <span className="font-normal text-muted-foreground">
                {" "}· Open {formatTime(hours.open)} - {formatTime(hours.close)}
              </span>
            )}
          </p>
        )}
      </section>

      {date && (
        <section aria-labelledby="time-heading">
          <h2 id="time-heading" className="mb-1 flex items-center gap-2 text-lg font-bold">
            <Clock className="h-5 w-5 text-primary" aria-hidden="true" /> Choose a start time
          </h2>
          <AvailabilityStatus availability={availability} />
          <SlotGrid slots={slots} start={draft.start} duration={draft.duration} onPick={pickSlot} />
        </section>
      )}

      {date && (
        <section aria-labelledby="duration-heading">
          <h2 id="duration-heading" className="mb-3 flex items-center gap-2 text-lg font-bold">
            <Clock className="h-5 w-5 text-primary" aria-hidden="true" /> How long will you play?
          </h2>
          <div
            role="radiogroup"
            aria-labelledby="duration-heading"
            className="grid grid-cols-3 gap-2 sm:grid-cols-6"
            onKeyDown={(e) => handleChoiceKeys(e)}
          >
            {bookingRules.durationOptions.map((d) => {
              const problemFor = (x: number) => (draft.start != null ? durationProblem(court, date, draft.start, x, availability.booked) : null);
              const problem = problemFor(d);
              const price = draft.start != null && !problem ? calculateFee(court, date, draft.start, d).total : null;
              const selected = draft.duration === d;
              const firstFitting = bookingRules.durationOptions.find((x) => problemFor(x) === null);
              return (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={rovingTabIndex(selected, draft.duration != null, d === firstFitting)}
                  disabled={problem !== null}
                  onClick={() => updateDraft({ duration: d })}
                  aria-label={`${formatDuration(d)}${price != null ? `, ${formatPeso(price)}` : ""}${problem ? problem === "closes" ? ", past closing time" : ", overlaps another booking" : ""}`}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center rounded-[10px] border-2 px-2 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary/60",
                    problem && "slot-unavailable cursor-not-allowed border-transparent text-muted-foreground line-through",
                  )}
                >
                  {formatDurationShort(d)}
                  {price != null && (
                    <span className={cn("text-xs font-medium", selected ? "text-primary-foreground/85" : "text-muted-foreground")}>
                      {formatPeso(price)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {draft.start == null && <p className="mt-2 text-xs text-muted-foreground">Pick a start time to see prices for each duration.</p>}
        </section>
      )}

      <AvailabilityNotice />
    </div>
  );
}

function DateStrip({ dates, openDates, selected, today, onSelect }: {
  dates: string[];
  openDates: string[];
  selected: string | null;
  today: string;
  onSelect: (d: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>("[aria-checked='true']");
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [selected]);

  const scrollBy = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * 280, behavior: "smooth" });

  return (
    <div className="relative">
      <div
        ref={scroller}
        role="radiogroup"
        aria-label="Booking date"
        className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
        onKeyDown={(e) => handleChoiceKeys(e)}
      >
        {dates.map((d) => {
          const isOpen = openDates.includes(d);
          const isSelected = selected === d;
          const label = d === today ? "Today" : formatDate(d, "weekday");
          return (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={rovingTabIndex(isSelected, selected != null && openDates.includes(selected), d === openDates[0])}
              disabled={!isOpen}
              onClick={() => onSelect(d)}
              aria-label={`${formatDate(d, "long")}${isOpen ? "" : ", no times available"}`}
              className={cn(
                "flex h-20 w-[4.25rem] shrink-0 snap-start flex-col items-center justify-center rounded-[10px] border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-border bg-card hover:border-primary/60",
                !isOpen && "slot-unavailable cursor-not-allowed border-transparent text-muted-foreground",
              )}
            >
              <span className={cn("text-[11px] font-semibold uppercase", isSelected ? "text-primary-foreground/85" : "text-muted-foreground")}>
                {label}
              </span>
              <span className="text-xl font-extrabold leading-tight">{formatDate(d, "day")}</span>
              <span className={cn("text-[11px] font-medium", isSelected ? "text-primary-foreground/85" : "text-muted-foreground")}>
                {isOpen ? formatDate(d, "month") : "Full/closed"}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 hidden justify-end gap-2 sm:flex">
        <Button type="button" variant="outline" size="sm" onClick={() => scrollBy(-1)} aria-label="Earlier dates"><ArrowLeft /></Button>
        <Button type="button" variant="outline" size="sm" onClick={() => scrollBy(1)} aria-label="Later dates"><ArrowRight /></Button>
      </div>
    </div>
  );
}

function AvailabilityStatus({ availability }: { availability: Availability }) {
  if (availability.status === "loading")
    return (
      <p className="mb-3 flex items-center gap-2 text-xs text-muted-foreground" role="status">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking the shared schedule…
      </p>
    );
  if (availability.status === "error")
    return (
      <p className="mb-3 flex items-center gap-2 text-xs text-amber-800" role="status">
        <AlertTriangle className="h-3.5 w-3.5" /> We couldn't load the live schedule. You can still request a slot - staff will check for conflicts.
      </p>
    );
  if (availability.status === "ok")
    return <p className="mb-3 text-xs text-muted-foreground">Slots already reserved are greyed out. Staff still confirm every request.</p>;
  return <p className="mb-3 text-xs text-muted-foreground">Times shown are within opening hours. Staff check for conflicts before confirming.</p>;
}

const periods = [
  { label: "Morning", icon: Sunrise, from: 0, to: 12 * 60 },
  { label: "Afternoon", icon: Sun, from: 12 * 60, to: 17 * 60 },
  { label: "Evening", icon: Moon, from: 17 * 60, to: 24 * 60 },
];

const slotReason: Record<StartSlot["state"], string> = {
  available: "",
  past: "too soon or already passed",
  booked: "already reserved",
  too_late: "not enough time before closing or the next booking",
};

function SlotGrid({ slots, start, duration, onPick }: {
  slots: StartSlot[];
  start: number | null;
  duration: number | null;
  onPick: (s: StartSlot) => void;
}) {
  const anyAvailable = slots.some((s) => s.state === "available");
  if (!anyAvailable) {
    return (
      <Alert variant="warning">
        <AlertTriangle />
        <AlertTitle>No start times left on this date</AlertTitle>
        <AlertDescription>Please pick another date.</AlertDescription>
      </Alert>
    );
  }
  const end = start != null && duration ? start + duration : null;
  const firstAvailable = slots.find((s) => s.state === "available")?.start;
  return (
    // Arrows move between times; Enter/Space picks one (picking may change the duration).
    <div className="space-y-5" onKeyDown={(e) => handleChoiceKeys(e, { selector: "[aria-pressed]", select: false })}>
      {periods.map((p) => {
        const list = slots.filter((s) => s.start >= p.from && s.start < p.to);
        if (!list.length) return null;
        return (
          <div key={p.label}>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <p.icon className="h-4 w-4" aria-hidden="true" /> {p.label}
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
              {list.map((s) => {
                const isStart = s.start === start;
                const inRange = end != null && start != null && s.start > start && s.start < end;
                const unavailable = s.state !== "available";
                return (
                  <button
                    key={s.start}
                    type="button"
                    disabled={unavailable}
                    aria-pressed={isStart}
                    tabIndex={rovingTabIndex(isStart, start != null, s.start === firstAvailable)}
                    aria-label={`${formatTime(s.start)}${s.peak ? ", peak rate" : ""}${unavailable ? `, unavailable: ${slotReason[s.state]}` : ""}`}
                    onClick={() => onPick(s)}
                    className={cn(
                      "relative flex h-12 items-center justify-center rounded-[10px] border-2 text-sm font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isStart && "border-primary bg-primary text-primary-foreground shadow-md",
                      inRange && !isStart && "border-primary/50 bg-primary/15 text-secondary-foreground",
                      !isStart && !inRange && !unavailable && "border-border bg-card hover:border-primary",
                      unavailable && "slot-unavailable cursor-not-allowed border-transparent text-muted-foreground/70 line-through",
                    )}
                  >
                    {formatTime(s.start)}
                    {s.peak && !unavailable && (
                      <span
                        className={cn("absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full", isStart ? "bg-ball" : "bg-amber-500")}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground" aria-label="Legend">
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border-2 border-border bg-card" /> Open</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-primary" /> Start</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-primary/50 bg-primary/15" /> Your time</li>
        <li className="flex items-center gap-1.5"><span className="slot-unavailable h-3 w-3 rounded" /> Unavailable</li>
        <li className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Peak rate</li>
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Step 3 - Details                                                          */
/* ------------------------------------------------------------------------- */

function DetailsStep({ details, onChange, onBack, onNext }: {
  details: DetailsInput;
  onChange: (d: DetailsInput) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [errors, setErrors] = useState<DetailsErrors>({});
  const [attempted, setAttempted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const set = <K extends keyof DetailsInput>(key: K, value: DetailsInput[K]) => {
    const next = { ...details, [key]: value };
    onChange(next);
    if (attempted) setErrors(validateDetails(next));
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    setAttempted(true);
    const found = validateDetails(details);
    setErrors(found);
    const first = (Object.keys(found) as (keyof DetailsInput)[])[0];
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`#${first}`)?.focus();
      return;
    }
    const mobile = normalizePhMobile(details.mobile);
    onChange({ ...details, fullName: details.fullName.trim().replace(/\s+/g, " "), email: details.email.trim(), mobile: mobile ? formatPhMobile(mobile) : details.mobile });
    onNext();
  }

  const remaining = bookingRules.specialRequestsMaxLength - details.specialRequests.length;

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-6" aria-labelledby="details-heading">
      <div>
        <h2 id="details-heading" className="text-xl font-bold">Your details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We'll use these to contact you about this booking only. Fields marked <span className="text-destructive">*</span> are required.
        </p>
      </div>

      {attempted && Object.keys(errors).length > 0 && (
        <Alert variant="destructive" role="alert">
          <AlertTriangle />
          <AlertTitle>Please check the highlighted fields</AlertTitle>
        </Alert>
      )}

      <Card>
        <CardContent className="space-y-5 pt-5 sm:pt-6">
          <Field id="fullName" label="Full name" required error={errors.fullName}>
            <Input
              {...fieldAria("fullName", errors.fullName)}
              autoComplete="name"
              autoCapitalize="words"
              enterKeyHint="next"
              value={details.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              placeholder="Juan Dela Cruz"
              maxLength={80}
            />
          </Field>
          <Field id="mobile" label="Mobile number" required error={errors.mobile} hint="We'll text you about payment verification and confirmation.">
            <Input
              {...fieldAria("mobile", errors.mobile, true)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="next"
              value={details.mobile}
              onChange={(e) => set("mobile", e.target.value)}
              onBlur={() => {
                const n = normalizePhMobile(details.mobile);
                if (n) set("mobile", formatPhMobile(n));
              }}
              placeholder="0917 123 4567"
              maxLength={20}
            />
          </Field>
          <Field id="email" label="Email address" optional error={errors.email} hint="Optional - for an email copy of updates.">
            <Input
              {...fieldAria("email", errors.email, true)}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              enterKeyHint="next"
              value={details.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@example.com"
              maxLength={120}
            />
          </Field>

          <fieldset className="space-y-2">
            <legend className="flex items-baseline gap-1.5 text-sm font-semibold">
              <Users className="h-4 w-4 self-center text-primary" aria-hidden="true" /> Number of players
              <span className="text-xs font-medium text-muted-foreground">(optional)</span>
            </legend>
            <div
              role="radiogroup"
              aria-label="Number of players"
              className="grid grid-cols-4 gap-2 sm:grid-cols-8"
              onKeyDown={(e) => handleChoiceKeys(e)}
            >
              {Array.from({ length: bookingRules.maxPlayers }, (_, i) => String(i + 1)).map((n) => {
                const selected = details.players === n;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    tabIndex={rovingTabIndex(selected, details.players !== "", n === "1")}
                    onClick={() => set("players", selected ? "" : n)}
                    className={cn(
                      "h-12 rounded-[10px] border-2 text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/60",
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            {errors.players && <p className="text-sm font-medium text-destructive">{errors.players}</p>}
          </fieldset>

          <Field
            id="specialRequests"
            label="Special requests"
            optional
            error={errors.specialRequests}
            hint={`e.g. paddle rentals, ball machine, coaching. ${remaining} characters left.`}
          >
            <Textarea
              {...fieldAria("specialRequests", errors.specialRequests, true)}
              value={details.specialRequests}
              onChange={(e) => set("specialRequests", e.target.value)}
              maxLength={bookingRules.specialRequestsMaxLength}
              rows={3}
            />
          </Field>

          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent"
                checked={details.consent}
                onCheckedChange={(v) => set("consent", v === true)}
                aria-invalid={errors.consent ? true : undefined}
                aria-describedby={errors.consent ? "consent-error" : undefined}
                className="mt-0.5"
              />
              <Label htmlFor="consent" className="text-sm font-normal leading-relaxed">
                I agree that {facility.name} may use my details to process and manage this booking, as described in the{" "}
                <Link to="/privacy" target="_blank" className="font-semibold text-primary underline underline-offset-2">
                  privacy notice
                </Link>
                . <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
            </div>
            {errors.consent && <p id="consent-error" className="text-sm font-medium text-destructive">{errors.consent}</p>}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" size="lg" onClick={onBack}>
          <ArrowLeft /> Back
        </Button>
        <Button type="submit" size="lg">
          Review booking <ArrowRight />
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------------- */
/* Step 4 - Review & submit                                                  */
/* ------------------------------------------------------------------------- */

function ReviewStep({ court, draft, fee, booked, onEdit, onSubmitted }: {
  court: Court;
  draft: Draft;
  fee: FeeBreakdown;
  booked: BookedRange[];
  onEdit: (s: Step) => void;
  onSubmitted: (b: BookingRequest, via: SentVia) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<SubmissionError | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const d = draft.details;
  const detailErrors = validateDetails(d);
  const detailsOk = Object.keys(detailErrors).length === 0;

  // One reference per unique request, reused on retries so a request that
  // reached the service but timed out can be matched up by staff.
  const referenceRef = useRef<{ key: string; ref: string } | null>(null);
  const requestKey = JSON.stringify([draft.courtId, draft.date, draft.start, draft.duration, d.fullName, d.mobile]);
  if (!referenceRef.current || referenceRef.current.key !== requestKey) {
    referenceRef.current = { key: requestKey, ref: generateBookingReference() };
  }

  // The request being sent from the customer's phone (phone mode, or as a backup after a service error).
  const [phoneBooking, setPhoneBooking] = useState<BookingRequest | null>(null);
  const [lastBooking, setLastBooking] = useState<BookingRequest | null>(null);
  const phoneMode = services.deliveryMode === "phone";
  const phonePanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phoneBooking) phonePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [phoneBooking]);

  function buildBooking(): BookingRequest | null {
    if (!draft.date || draft.start == null || !draft.duration) return null;
    if (!detailsOk) {
      onEdit(2);
      return null;
    }
    if (!isSelectionValid(court, draft.date, draft.start, draft.duration, booked)) {
      toast.error("That time can no longer be requested. Please pick another slot.");
      onEdit(1);
      return null;
    }
    const mobile = normalizePhMobile(d.mobile)!;
    return {
      reference: referenceRef.current!.ref,
      court,
      date: draft.date,
      start: draft.start,
      duration: draft.duration,
      fee: calculateFee(court, draft.date, draft.start, draft.duration),
      fullName: d.fullName.trim(),
      mobile,
      email: d.email.trim(),
      players: d.players,
      specialRequests: d.specialRequests.trim(),
      submittedAt: nowStamp(),
    };
  }

  async function submit() {
    if (submitting || honeypot) return; // honeypot filled = bot
    const booking = buildBooking();
    if (!booking) return;
    setLastBooking(booking);
    if (phoneMode) {
      setPhoneBooking(booking);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitBookingRequest(booking);
      onSubmitted(booking, "service");
    } catch (err) {
      setError(err instanceof SubmissionError ? err : new SubmissionError("network", "Something went wrong. Please try again."));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Review your booking request</h2>
        <p className="mt-1 text-sm text-muted-foreground">Check everything before you {phoneMode ? "send it" : "submit"}.</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Court & time</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onEdit(1)} disabled={submitting}>
            <Pencil /> Edit
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <SummaryRow label="Court" value={<span className="inline-flex items-center gap-2">{court.name}</span>} />
            <SummaryRow label="Type" value={<span className="capitalize">{court.type}</span>} />
            <SummaryRow label="Date" value={formatDate(draft.date!, "long")} />
            <SummaryRow label="Time" value={formatTimeRange(draft.start!, draft.duration!)} />
            <SummaryRow label="Duration" value={formatDuration(draft.duration!)} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Your details</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onEdit(2)} disabled={submitting}>
            <Pencil /> Edit
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <SummaryRow label="Name" value={d.fullName} />
            <SummaryRow label="Mobile" value={d.mobile} />
            <SummaryRow label="Email" value={d.email || "-"} />
            <SummaryRow label="Players" value={d.players || "-"} />
            <SummaryRow label="Special requests" value={<span className="whitespace-pre-wrap font-normal">{d.specialRequests || "-"}</span>} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Estimated rental fee</CardTitle>
        </CardHeader>
        <CardContent>
          <FeeLines court={court} fee={fee} />
        </CardContent>
      </Card>

      <Alert variant="info">
        <AlertTriangle />
        <AlertTitle>This is a booking request, not a confirmed reservation</AlertTitle>
        <AlertDescription>
          {phoneMode
            ? "Next, you'll send this request from your phone by SMS, Viber, Messenger or email - we'll write the message for you. "
            : "After you submit, you'll get a booking reference and payment instructions. "}
          Pay within {bookingRules.paymentWindowHours} hours and send your receipt. Your court is reserved only after staff
          verify your payment and confirm the slot is free.
        </AlertDescription>
      </Alert>

      {/* Honeypot: hidden from people, often filled in by bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Leave this empty
          <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
        </label>
      </div>

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTriangle />
          <AlertTitle>
            {error.kind === "timeout" ? "We didn't get a response in time" : "Your booking request was not submitted"}
          </AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{error.message}</p>
            {error.kind === "timeout" && (
              <p>
                It's safe to try again - we'll send it with the same reference (
                <span className="font-mono font-semibold">{referenceRef.current!.ref}</span>) so staff can spot duplicates.
              </p>
            )}
            <p>
              Still not working? Send it from your phone instead, or call us at{" "}
              <a className="font-semibold underline" href={`tel:${facility.contact.phoneHref}`}>{facility.contact.phone}</a>.
            </p>
            {lastBooking && !phoneBooking && (
              <Button type="button" variant="outline" className="mt-1 bg-card" onClick={() => setPhoneBooking(lastBooking)}>
                <Smartphone /> Send from my phone instead
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {phoneBooking && (
        <div ref={phonePanelRef} className="scroll-mt-24">
          <SendViaPhone
            message={bookingMessage(phoneBooking)}
            sentLabel="I've sent my booking request"
            title={phoneMode ? "Send your booking request" : "Send it from your phone instead"}
            onSent={() => onSubmitted(phoneBooking, "phone")}
          />
        </div>
      )}

      {!phoneBooking && (
        <>
          <div className="hidden flex-col-reverse gap-3 sm:flex sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" size="lg" onClick={() => onEdit(2)} disabled={submitting}>
              <ArrowLeft /> Back
            </Button>
            <SubmitButton submitting={submitting} retry={!!error} phoneMode={phoneMode} onClick={submit} total={fee.total} />
          </div>

          {/* Mobile: sticky submit */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 px-4 pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur pb-safe sm:hidden">
            <SubmitButton submitting={submitting} retry={!!error} phoneMode={phoneMode} onClick={submit} total={fee.total} className="w-full" />
          </div>
        </>
      )}
    </div>
  );
}

function SubmitButton({ submitting, retry, phoneMode, onClick, total, className }: {
  submitting: boolean;
  retry: boolean;
  phoneMode: boolean;
  onClick: () => void;
  total: number;
  className?: string;
}) {
  return (
    <Button type="button" size="xl" onClick={onClick} disabled={submitting} aria-busy={submitting} className={className}>
      {submitting ? (
        <>
          <Loader2 className="animate-spin" /> Submitting request…
        </>
      ) : retry ? (
        <>
          <RefreshCw /> Try again
        </>
      ) : phoneMode ? (
        <>
          <Smartphone /> Continue to send request · {formatPeso(total)}
        </>
      ) : (
        <>
          <Send /> Submit booking request · {formatPeso(total)}
        </>
      )}
    </Button>
  );
}

function FeeLines({ court, fee }: { court: Court; fee: FeeBreakdown }) {
  return (
    <dl className="divide-y">
      {fee.standardMinutes > 0 && (
        <SummaryRow label={`Standard · ${formatDuration(fee.standardMinutes)} × ${formatPeso(court.rate)}/hr`} value={formatPeso(fee.standardAmount)} />
      )}
      {fee.peakMinutes > 0 && (
        <SummaryRow label={`Peak · ${formatDuration(fee.peakMinutes)} × ${formatPeso(court.peakRate)}/hr`} value={formatPeso(fee.peakAmount)} />
      )}
      <SummaryRow label="Estimated total" value={formatPeso(fee.total)} strong />
    </dl>
  );
}

/* ------------------------------------------------------------------------- */
/* Summary (desktop sidebar) and sticky mobile bar                           */
/* ------------------------------------------------------------------------- */

function SummaryCard({ court, draft, fee }: { court?: Court; draft: Draft; fee: FeeBreakdown | null }) {
  const validDate = isValidDateString(draft.date) ? draft.date : null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Your selection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {court ? (
          <div className="flex items-center gap-3">
            <img src={court.image} alt="" className="h-12 w-16 rounded-md object-cover" width={64} height={48} />
            <div>
              <p className="font-bold leading-tight">{court.name}</p>
              <p className="text-xs capitalize text-muted-foreground">{court.type}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No court selected yet.</p>
        )}
        <Separator />
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Date</dt>
            <dd className="text-right font-semibold">{validDate ? formatDate(validDate, "medium") : "-"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Time</dt>
            <dd className="text-right font-semibold">
              {draft.start != null && draft.duration ? formatTimeRange(draft.start, draft.duration) : draft.start != null ? formatTime(draft.start) : "-"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Duration</dt>
            <dd className="text-right font-semibold">{draft.duration ? formatDuration(draft.duration) : "-"}</dd>
          </div>
        </dl>
        <Separator />
        <div className="flex items-end justify-between">
          <span className="text-sm text-muted-foreground">Estimated total</span>
          <span className="text-2xl font-extrabold tabular-nums" aria-live="polite">{fee ? formatPeso(fee.total) : "-"}</span>
        </div>
        {fee && fee.peakMinutes > 0 && (
          <p className="text-xs text-muted-foreground">Includes {formatDuration(fee.peakMinutes)} at the peak rate.</p>
        )}
      </CardContent>
    </Card>
  );
}

function MobileBar({ court, draft, fee, actionLabel, disabled, onAction, onBack }: {
  court?: Court;
  draft: Draft;
  fee: FeeBreakdown | null;
  actionLabel: string;
  disabled: boolean;
  onAction: () => void;
  onBack: () => void;
}) {
  const summary =
    draft.date && draft.start != null && draft.duration
      ? `${formatDate(draft.date, "short")} · ${formatTimeRange(draft.start, draft.duration)}`
      : draft.start == null
        ? "Pick a start time"
        : "Pick a duration";
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur pb-safe">
      <div className="container flex items-center gap-3">
        <Button type="button" variant="outline" size="icon" onClick={onBack} aria-label="Back to courts" className="lg:hidden">
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="truncate text-xs text-muted-foreground">
            {court?.code} · {summary}
          </p>
          <p className="text-lg font-extrabold tabular-nums leading-tight">{fee ? formatPeso(fee.total) : "-"}</p>
        </div>
        <Button type="button" size="lg" onClick={onAction} disabled={disabled}>
          {actionLabel} <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
