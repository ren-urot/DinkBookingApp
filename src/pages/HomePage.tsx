import { Link } from "react-router-dom";
import { ArrowRight, CalendarCheck, Check, Clock, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/common";
import {
  AvailabilityNotice,
  ContactCard,
  CourtCard,
  HoursTable,
  HowItWorks,
  LocationCard,
  PolicyList,
  RatesTable,
} from "@/components/facility";
import { PaymentInstructions } from "@/components/payment";
import { courts } from "@/config/courts";
import { bookingRules, facility } from "@/config/facility";
import { cancellationPolicy } from "@/config/policies";
import { formatPeso } from "@/lib/pricing";

export default function HomePage() {
  const featured = courts.filter((c) => c.featured);
  const lowestRate = Math.min(...courts.map((c) => c.rate));

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-court-pattern">
        <div className="container grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-bold text-primary shadow-sm">
              <span className="h-2 w-2 rounded-full bg-ball ring-2 ring-primary/30" aria-hidden="true" />
              Now booking up to {bookingRules.advanceBookingDays} days ahead
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {facility.tagline.split(". ")[0]}.{" "}
              <span className="text-primary">{facility.tagline.split(". ").slice(1).join(". ")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">{facility.intro}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl" className="shadow-lg shadow-primary/20">
                <Link to="/book">
                  <CalendarCheck className="!size-5" /> Book a Court
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link to="/rates">See rates & hours</Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground">
              <li className="flex items-center gap-1.5"><UserX className="h-4 w-4 text-primary" /> No account needed</li>
              <li className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary" /> Book in under 2 minutes</li>
              <li className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> From {formatPeso(lowestRate)}/hr</li>
            </ul>
          </div>
          <div className="relative hidden lg:block">
            <div className="absolute -inset-4 rotate-2 rounded-3xl bg-ball/40" aria-hidden="true" />
            <img
              src={courts[0].image}
              alt={courts[0].imageAlt}
              className="relative rounded-3xl border-4 border-card shadow-xl"
              width={640}
              height={400}
            />
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="container py-12" aria-labelledby="about">
        <div className="grid gap-6 md:grid-cols-[1fr_1.4fr] md:items-center">
          <div>
            <h2 id="about" className="text-2xl font-extrabold tracking-tight sm:text-3xl">Welcome to {facility.shortName}</h2>
            <p className="mt-3 text-muted-foreground">
              Whether it's a casual rally with friends, a drill session, or a team match, we keep it simple: pick a slot,
              pay online, and we'll have the court ready when you arrive.
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-3">
            {facility.highlights.map((h) => (
              <li key={h} className="flex items-center gap-2 rounded-xl border bg-card p-4 text-sm font-semibold">
                <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /> {h}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Featured courts */}
      <section className="container py-8" aria-labelledby="courts">
        <SectionHeading
          id="courts"
          eyebrow="Courts"
          title="Featured courts"
          action={
            <Button asChild variant="ghost">
              <Link to="/courts">All courts <ArrowRight /></Link>
            </Button>
          }
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((c) => (
            <CourtCard key={c.id} court={c} />
          ))}
        </div>
      </section>

      {/* Rates + hours */}
      <section className="container grid gap-8 py-12 lg:grid-cols-2" aria-label="Rates and operating hours">
        <div>
          <SectionHeading id="rates" eyebrow="Rates" title="Court rental rates" />
          <RatesTable />
        </div>
        <div>
          <SectionHeading id="hours" eyebrow="Hours" title="Operating hours" />
          <HoursTable />
        </div>
      </section>

      {/* How to book */}
      <section className="border-y bg-card/60 py-12" aria-labelledby="how">
        <div className="container">
          <SectionHeading
            id="how"
            eyebrow="How it works"
            title="Booking instructions"
            description="Your booking is confirmed only after our staff verify your payment and the court schedule."
          />
          <HowItWorks />
          <AvailabilityNotice className="mt-4" />
          <div className="mt-6">
            <Button asChild size="lg">
              <Link to="/book"><CalendarCheck /> Start booking</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Payment */}
      <section className="container grid gap-8 py-12 lg:grid-cols-[0.9fr_1.1fr]" aria-labelledby="payment">
        <div>
          <SectionHeading
            id="payment"
            eyebrow="Payment"
            title="Pay with GCash or bank transfer"
            description={`After you send a booking request, pay the total within ${bookingRules.paymentWindowHours} hours and upload your receipt. Staff verify every payment against our GCash and bank records before confirming.`}
          />
          <Button asChild variant="outline">
            <Link to="/pay">Already paid? Submit your receipt <ArrowRight /></Link>
          </Button>
        </div>
        <PaymentInstructions />
      </section>

      {/* Policy */}
      <section className="container py-8" aria-labelledby="policy">
        <SectionHeading
          id="policy"
          eyebrow="Policy"
          title="Cancellation & refunds"
          description={cancellationPolicy.summary}
          action={
            <Button asChild variant="ghost">
              <Link to="/policies">Full policy <ArrowRight /></Link>
            </Button>
          }
        />
        <PolicyList compact />
      </section>

      {/* Location & contact */}
      <section className="container py-12" aria-labelledby="contact">
        <SectionHeading id="contact" eyebrow="Visit us" title="Location & contact" />
        <div className="grid gap-5 md:grid-cols-2">
          <LocationCard />
          <ContactCard />
        </div>
      </section>
    </>
  );
}
