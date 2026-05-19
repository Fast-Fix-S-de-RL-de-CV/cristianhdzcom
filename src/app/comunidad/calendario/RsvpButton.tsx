"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function RsvpButton({ eventId, initialAttending = false }: { eventId: string; initialAttending?: boolean }) {
  const [attending, setAttending] = useState(initialAttending);
  return (
    <Button
      variant={attending ? "ghost" : "primary"}
      size="sm"
      onClick={(e) => {
        e.preventDefault();
        setAttending((v) => !v);
      }}
      data-event-id={eventId}
    >
      {attending ? "✓ Apuntado" : "Apuntarme"}
    </Button>
  );
}
