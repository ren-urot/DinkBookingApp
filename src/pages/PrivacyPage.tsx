import { PageHeader } from "@/components/common";
import { facility } from "@/config/facility";

const sections = [
  {
    title: "What we collect",
    body: [
      "Booking requests: your full name, mobile number, the court, date, time and duration you request, and - only if you provide them - your email address, number of players and special requests.",
      "Payment receipts: your booking reference, payment method, transaction reference number, amount paid, and the receipt image or PDF you upload.",
      "We do not ask you to create an account and we do not collect passwords, card numbers or GCash PINs. Never send us your PIN or OTP.",
    ],
  },
  {
    title: "Why we collect it",
    body: [
      "To check court availability, verify your payment against our GCash or bank records, confirm or decline your reservation, and contact you about your booking, rescheduling or refunds.",
    ],
  },
  {
    title: "Where it is stored",
    body: [
      "This website has no database of its own. When you submit a form, your details are sent over HTTPS to the booking service our staff use to receive and manage reservations. Receipts are stored in access-controlled storage that only authorised staff can view.",
      "Your details are not saved in your browser's local storage. If you refresh the page after booking, keep a note of your booking reference.",
    ],
  },
  {
    title: "How long we keep it",
    body: [
      "Booking and payment records are kept only as long as needed for the reservation, refunds, and our accounting and legal obligations, after which they are deleted from the booking service.",
    ],
  },
  {
    title: "Who can see it",
    body: [
      "Only authorised facility staff. We don't sell your data or share it with third parties, except the service providers that process our submissions and any disclosure required by law.",
    ],
  },
  {
    title: "Your rights",
    body: [
      `Under the Philippine Data Privacy Act of 2012, you can ask to access, correct or delete your personal data, or object to its processing. Email ${facility.privacyContactEmail} and include your booking reference.`,
    ],
  },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export default function PrivacyPage() {
  return (
    <>
      <PageHeader eyebrow="Privacy" title="Privacy notice" description={`How ${facility.name} handles the information you submit.`} />
      <div className="container max-w-3xl space-y-8 py-10">
        {sections.map((s) => (
          <section key={s.title} aria-labelledby={slug(s.title)}>
            <h2 id={slug(s.title)} className="mb-2 text-xl font-bold">{s.title}</h2>
            <div className="space-y-2 text-muted-foreground">
              {s.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>
        ))}
        <p className="rounded-xl border bg-card p-4 text-sm">
          Privacy contact:{" "}
          <a className="font-semibold text-primary underline-offset-4 hover:underline" href={`mailto:${facility.privacyContactEmail}`}>
            {facility.privacyContactEmail}
          </a>
        </p>
      </div>
    </>
  );
}
