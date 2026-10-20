import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, description, children }: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="border-b bg-court-pattern">
      <div className="container py-8 sm:py-12">
        {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">{eyebrow}</p>}
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        {description && <div className="mt-3 max-w-2xl text-muted-foreground">{description}</div>}
        {children}
      </div>
    </div>
  );
}

export function SectionHeading({ id, eyebrow, title, description, action }: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">{eyebrow}</p>}
        <h2 id={id} className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy - please select and copy it manually.");
    }
  }
  return (
    <Button type="button" variant="outline" size="sm" onClick={copy} className={cn("shrink-0", className)} aria-label={`Copy ${label}`}>
      {copied ? <Check className="text-primary" /> : <Copy />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </Button>
  );
}

/** Label + control + hint + error, wired up with aria attributes. */
export function Field({ id, label, required, optional, hint, error, children, className }: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="flex items-baseline gap-1.5">
        {label}
        {required && <span className="text-destructive" aria-hidden="true">*</span>}
        {optional && <span className="text-xs font-medium text-muted-foreground">(optional)</span>}
      </Label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** aria props for a control rendered inside <Field>. */
export function fieldAria(id: string, error?: string, hasHint?: boolean) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hasHint ? `${id}-hint` : undefined,
  } as const;
}

const ARROW_STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * Arrow-key navigation for a group of choice buttons (ARIA roving tabindex).
 * Attach to the group's onKeyDown. With `select`, the newly focused choice is
 * also chosen (radio behaviour); otherwise Enter/Space chooses.
 */
export function handleChoiceKeys(e: KeyboardEvent<HTMLElement>, { selector = "[role=radio]", select = true } = {}) {
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>(`${selector}:not([disabled])`));
  const current = items.indexOf(document.activeElement as HTMLButtonElement);
  if (current < 0) return;
  let next: number;
  if (e.key in ARROW_STEP) next = (current + ARROW_STEP[e.key] + items.length) % items.length;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = items.length - 1;
  else return;
  e.preventDefault();
  items[next].focus();
  items[next].scrollIntoView({ block: "nearest", inline: "nearest" });
  if (select) items[next].click();
}

/** tabIndex for one choice in a roving group: the chosen one, or the first available one when nothing is chosen. */
export function rovingTabIndex(isSelected: boolean, anySelected: boolean, isFirstAvailable: boolean) {
  return isSelected || (!anySelected && isFirstAvailable) ? 0 : -1;
}

export function SummaryRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn("text-right text-sm font-semibold", strong && "text-base font-extrabold")}>{value}</dd>
    </div>
  );
}
