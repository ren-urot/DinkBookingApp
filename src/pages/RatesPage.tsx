import { Link } from "react-router-dom";
import { CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionHeading } from "@/components/common";
import { AddOnsList, HoursTable, PolicyList, RatesTable } from "@/components/facility";
import { bookingRules } from "@/config/facility";
import { cancellationPolicy, houseRules } from "@/config/policies";
import { formatDurationShort } from "@/lib/time";

export default function RatesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Rates"
        title="Rates & hours"
        description="Simple hourly pricing. The booking form shows your estimated total before you submit."
      >
        <Button asChild size="lg" className="mt-6">
          <Link to="/book"><CalendarCheck /> Book a Court</Link>
        </Button>
      </PageHeader>
      <div className="container space-y-12 py-10">
        <section className="grid gap-8 lg:grid-cols-2">
          <div>
            <SectionHeading id="court-rates" title="Court rental rates" />
            <RatesTable />
            <p className="mt-3 text-sm text-muted-foreground">
              Durations: {bookingRules.durationOptions.map(formatDurationShort).join(", ")}. Start times every{" "}
              {bookingRules.slotIntervalMinutes} minutes.
            </p>
          </div>
          <div>
            <SectionHeading id="hours" title="Operating hours" />
            <HoursTable />
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div>
            <SectionHeading id="add-ons" title="Add-ons" description="Paid at the front desk on the day." />
            <AddOnsList />
          </div>
          <div>
            <SectionHeading id="house-rules" title="House rules" />
            <ul className="list-disc space-y-2 rounded-xl border bg-card p-4 pl-8 text-sm">
              {houseRules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <SectionHeading id="policy" title="Cancellation & refunds" description={cancellationPolicy.summary} />
          <PolicyList />
        </section>
      </div>
    </>
  );
}
