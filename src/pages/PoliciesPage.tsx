import { PageHeader, SectionHeading } from "@/components/common";
import { ContactCard, PolicyList } from "@/components/facility";
import { StatusGlossary } from "@/components/status";
import { bookingRules } from "@/config/facility";
import { cancellationPolicy, houseRules } from "@/config/policies";

export default function PoliciesPage() {
  return (
    <>
      <PageHeader eyebrow="Policies" title="Cancellation & refund policy" description={cancellationPolicy.summary} />
      <div className="container space-y-12 py-10">
        <section>
          <PolicyList />
        </section>
        <section>
          <SectionHeading
            id="payment-deadline"
            title="Payment deadline"
            description={`Please pay within ${bookingRules.paymentWindowHours} hours of submitting your request. Unpaid requests may be released so other players can book the slot.`}
          />
        </section>
        <section>
          <SectionHeading
            id="statuses"
            title="What booking statuses mean"
            description="Only staff can confirm a reservation. Your booking is not confirmed until you hear from us."
          />
          <StatusGlossary />
        </section>
        <section className="grid gap-8 lg:grid-cols-2">
          <div>
            <SectionHeading id="house-rules" title="House rules" />
            <ul className="list-disc space-y-2 rounded-xl border bg-card p-4 pl-8 text-sm">
              {houseRules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          <ContactCard />
        </section>
      </div>
    </>
  );
}
