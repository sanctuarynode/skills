// Place at: apps/web/app/dashboard/things/_components/dialog-create-thing.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"; // packages/ui
import { Button } from "@/components/ui/button"; // packages/ui
import { CreateThingForm } from "@/components/things/create-thing-form";

// Route-local: opens the dialog shell, renders the shared form inside.
// The form itself lives in components/things/ because it's reusable
// outside a dialog too (e.g. a dedicated /things/new page).
export function DialogCreateThing({ orgSlug }: { orgSlug: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New thing</Button>
      </DialogTrigger>
      <DialogContent>
        <CreateThingForm
          orgSlug={orgSlug}
          onSuccess={() => setOpen(false)}
          className="flex flex-col gap-4"
        />
      </DialogContent>
    </Dialog>
  );
}
