import { useState } from "react";
import { PageHeader } from "@/components/common";
import { AvailabilityNotice, CourtCard } from "@/components/facility";
import { courts, type Court } from "@/config/courts";
import { cn } from "@/lib/utils";

type Filter = "all" | Court["type"];

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All courts" },
  { value: "indoor", label: "Indoor" },
  { value: "outdoor", label: "Outdoor" },
];

export default function CourtsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const list = filter === "all" ? courts : courts.filter((c) => c.type === filter);

  return (
    <>
      <PageHeader
        eyebrow="Courts"
        title="Choose your court"
        description="Indoor and outdoor courts with hourly rates. Tap “Book This Court” to pick a date and time."
      />
      <div className="container py-8">
        <div role="group" aria-label="Filter courts" className="mb-6 flex gap-2 overflow-x-auto no-scrollbar">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={cn(
                "h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filter === f.value ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-secondary",
              )}
            >
              {f.label} <span className="opacity-70">({f.value === "all" ? courts.length : courts.filter((c) => c.type === f.value).length})</span>
            </button>
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <CourtCard key={c.id} court={c} />
          ))}
        </div>
        <AvailabilityNotice className="mt-6" />
      </div>
    </>
  );
}
