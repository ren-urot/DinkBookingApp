import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Mail, MessageCircle, MessageSquare, Paperclip, Phone, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/common";
import { facility } from "@/config/facility";
import { messageLinks, type OutgoingMessage } from "@/lib/message";
import { cn } from "@/lib/utils";

/**
 * Lets the customer send a pre-written message from their own phone
 * (share sheet, SMS, Viber, Messenger or email). Used when no form service is
 * configured, and as a backup when the service fails. The website cannot see
 * whether the message was actually sent, so the customer confirms it.
 */
export function SendViaPhone({ message, file, onSent, sentLabel, title = "Send it from your phone", className }: {
  message: OutgoingMessage;
  /** Attached automatically when the phone's share menu supports files. */
  file?: File | null;
  onSent: () => void;
  sentLabel: string;
  title?: string;
  className?: string;
}) {
  const [opened, setOpened] = useState(false);
  const [returned, setReturned] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  const links = messageLinks(message);

  // When the customer comes back from their SMS/Viber/Messenger/email app, bring the
  // final "I've sent it" step into view - it's easy to forget after switching apps.
  useEffect(() => {
    if (!opened) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      setReturned(true);
      setTimeout(() => confirmRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [opened]);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const canShareFile = Boolean(file && canShare && navigator.canShare?.({ files: [file] }));

  async function share() {
    try {
      await navigator.share({ title: message.subject, text: message.text, ...(canShareFile && file ? { files: [file] } : {}) });
      setOpened(true);
    } catch (err) {
      if ((err as Error).name !== "AbortError") toast.error("Sharing didn't work here. Try one of the buttons below.");
    }
  }

  async function openMessenger() {
    try {
      await navigator.clipboard.writeText(message.text);
      toast.success("Message copied - paste it into the Messenger chat.");
    } catch {
      toast.info("Copy the message below, then paste it into Messenger.");
    }
    window.open(links.messenger, "_blank", "noopener,noreferrer");
    setOpened(true);
  }

  const channel = "flex min-h-14 items-center gap-3 rounded-[10px] border-2 bg-card px-3 py-2 text-left text-sm font-semibold transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <Card className={cn("border-primary/40", className)}>
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          1. Tap an app below. 2. Press <strong>Send</strong> in that app. 3. Come back here and confirm.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {file && !canShareFile && (
          <p className="flex gap-2 rounded-lg bg-warning p-3 text-sm text-warning-foreground">
            <Paperclip className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Remember to attach your receipt screenshot in the chat before you press Send.
          </p>
        )}

        {canShare && (
          <Button type="button" size="xl" className="w-full" onClick={share}>
            <Share2 className="!size-5" /> {canShareFile ? "Share message & receipt…" : "Share to any app…"}
          </Button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <a href={links.sms} onClick={() => setOpened(true)} className={channel}>
            <MessageSquare className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /> SMS
          </a>
          <a href={links.viber} onClick={() => setOpened(true)} className={channel}>
            <Phone className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /> Viber
          </a>
          <button type="button" onClick={openMessenger} className={channel}>
            <MessageCircle className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /> Messenger
          </button>
          <a href={links.email} onClick={() => setOpened(true)} className={channel}>
            <Mail className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /> Email
          </a>
        </div>

        <p className="text-xs text-muted-foreground">
          Send to <span className="font-semibold text-foreground">{facility.contact.phone}</span> (SMS / Viber) or{" "}
          <span className="font-semibold text-foreground">{facility.contact.email}</span>.
        </p>

        <details className="rounded-lg border bg-background">
          <summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold">Preview the message</summary>
          <div className="space-y-2 border-t p-3">
            <pre className="whitespace-pre-wrap break-words font-sans text-sm">{message.text}</pre>
            <CopyButton value={message.text} label="Message" />
          </div>
        </details>

        <div
          ref={confirmRef}
          className={cn(
            "scroll-mt-24 space-y-2 rounded-lg p-3 transition-shadow",
            opened ? "bg-secondary" : "bg-muted/60",
            returned && "ring-2 ring-primary ring-offset-2",
          )}
        >
          <p className="text-sm font-semibold" aria-live="polite">
            {returned
              ? "Welcome back! Did you press Send? Tap below to finish."
              : opened
                ? "Did you press Send in your app?"
                : "Already sent it another way?"}
          </p>
          <Button type="button" size="lg" variant={opened ? "default" : "outline"} className="w-full" onClick={onSent}>
            <CheckCircle2 /> {sentLabel}
          </Button>
          <p className="text-xs text-muted-foreground">
            We can't see your messages, so the facility will reply to let you know they received it.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
