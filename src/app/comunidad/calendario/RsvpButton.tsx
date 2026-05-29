"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function RsvpButton({
  eventId,
  initialAttending = false,
}: {
  eventId: string;
  initialAttending?: boolean;
}) {
  const [attending, setAttending] = useState(initialAttending);
  const [pending, setPending] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = (await res.json()) as { attending: boolean; count: number };
        setAttending(data.attending);
      }
    } catch {
      /* swallow */
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant={attending ? "ghost" : "primary"}
      size="sm"
      onClick={toggle}
      disabled={pending}
      data-event-id={eventId}
    >
      {attending ? "✓ Apuntado" : "Apuntarme"}
    </Button>
  );
}
