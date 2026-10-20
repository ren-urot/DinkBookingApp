import { facility } from "@/config/facility";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn("h-9 w-9", className)}>
      <rect width="48" height="48" rx="12" fill="hsl(var(--primary))" />
      {/* Pickleball with holes */}
      <circle cx="24" cy="24" r="14" fill="hsl(var(--ball))" />
      <g fill="hsl(var(--primary))" opacity="0.85">
        <circle cx="24" cy="15.5" r="2" />
        <circle cx="17" cy="20" r="2" />
        <circle cx="31" cy="20" r="2" />
        <circle cx="24" cy="24" r="2" />
        <circle cx="17.5" cy="28.5" r="2" />
        <circle cx="30.5" cy="28.5" r="2" />
        <circle cx="24" cy="32.5" r="2" />
      </g>
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        {compact ? (
          <span className="text-base font-extrabold tracking-tight">{facility.shortName}</span>
        ) : (
          <>
            <span className="text-base font-extrabold tracking-tight sm:hidden">{facility.shortName}</span>
            <span className="hidden text-base font-extrabold tracking-tight sm:inline">{facility.name}</span>
          </>
        )}
        {!compact && <span className="mt-0.5 text-[11px] font-medium text-muted-foreground">Court bookings</span>}
      </span>
    </span>
  );
}
