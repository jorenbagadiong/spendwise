"use client";

import { useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { profileNameFormSchema } from "@/lib/profile/profile";
import { useProfileController } from "@/stores/finance-data-provider";

type EditProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  onSaved: (fullName: string) => void;
};

export function EditProfileDialog({ open, onOpenChange, currentName, onSaved }: EditProfileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Your name personalizes the app and is saved only in this browser.</DialogDescription>
        </DialogHeader>
        {/* The popup unmounts when closed, so each open starts from the saved name. */}
        <EditProfileForm currentName={currentName} onSaved={onSaved} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function EditProfileForm({ currentName, onSaved, onDone }: { currentName: string; onSaved: (fullName: string) => void; onDone: () => void }) {
  const profile = useProfileController();
  const nameId = useId();
  const { register, handleSubmit, formState, setError } = useForm({
    resolver: zodResolver(profileNameFormSchema),
    defaultValues: { fullName: currentName },
  });

  function onSubmit({ fullName }: { fullName: string }) {
    const result = profile.updateName(fullName);
    if (!result.ok) {
      // Shown inline; the dialog stays open and nothing changed.
      setError("fullName", { message: `Your name couldn't be saved. ${result.message}` });
      return;
    }
    onSaved(fullName);
    onDone();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <Field data-invalid={!!formState.errors.fullName}>
        <FieldLabel htmlFor={nameId}>Full name</FieldLabel>
        <Input
          id={nameId}
          autoComplete="name"
          aria-invalid={!!formState.errors.fullName}
          aria-describedby={`${nameId}-error`}
          {...register("fullName")}
        />
        <FieldError id={`${nameId}-error`} errors={[formState.errors.fullName]} />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={formState.isSubmitting}>
          Save changes
        </Button>
      </DialogFooter>
    </form>
  );
}
