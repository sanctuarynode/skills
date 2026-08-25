// Place at: apps/web/components/things/create-thing-form.tsx
"use client";

import { useTransition } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { createThing } from "@/lib/action/things";
import { createThingSchema } from "@/lib/schema";

// Resource-first placement (components/things/…): "things" has no per-role
// field differences here. If it did, this would move to
// components/<role>/things/create-thing.tsx instead — role-first is the
// default, resource-first is the exception.
export function CreateThingForm({
  orgSlug,
  onSuccess,
  className,
}: {
  orgSlug: string;
  onSuccess?: () => void;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    defaultValues: { name: "" },
    validators: { onSubmit: createThingSchema },
    onSubmit: ({ value }) => {
      startTransition(async () => {
        try {
          await createThing(orgSlug, value);
          toast.success("Thing created");
          onSuccess?.();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Something went wrong");
        }
      });
    },
  });

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Field name="name">
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Name</FieldLabel>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={isInvalid}
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      </form.Field>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
