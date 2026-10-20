import { Link } from "react-router-dom";
import { Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionHeading } from "@/components/common";
import { ContactCard, HoursTable, LocationCard } from "@/components/facility";
import { facility } from "@/config/facility";

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        description="Questions about a booking, payment or the courts? Message the front desk - please include your booking reference if you have one."
      />
      <div className="container space-y-10 py-10">
        <div className="grid gap-5 md:grid-cols-2">
          <ContactCard />
          <LocationCard />
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <SectionHeading id="hours" title="Operating hours" />
            <HoursTable />
          </div>
          <div>
            <SectionHeading id="help" title="Already booked?" />
            <div className="grid gap-3">
              <Button asChild variant="outline" size="lg" className="justify-start">
                <Link to="/pay"><Upload /> Submit a payment receipt</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="justify-start">
                <Link to="/check-booking"><Search /> Check a booking</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Privacy requests (access, correction or deletion of your booking data):{" "}
              <a className="font-semibold text-primary underline-offset-4 hover:underline" href={`mailto:${facility.privacyContactEmail}`}>
                {facility.privacyContactEmail}
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
