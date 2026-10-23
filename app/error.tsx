"use client";

import { ArrowsClockwise, VinylRecord } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="app-message">
      <VinylRecord size={46} />
      <h1>A little skip in the record.</h1>
      <p>Your saved progress is still here. Let’s give that another spin.</p>
      <Button onClick={reset}>
        <ArrowsClockwise size={18} /> Try again
      </Button>
    </main>
  );
}
