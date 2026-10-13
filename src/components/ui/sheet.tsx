"use client";

import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import type { ReactNode } from "react";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

/** Bottom sheet on phones, centered card on larger screens. */
export function Sheet({ open, onOpenChange, title, description, children }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_150ms_ease-out]" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] border-2 border-b-0 border-border bg-surface p-6 pb-8 shadow-2xl outline-none sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 sm:rounded-[2rem] sm:border-b-2">
          <Dialog.Close
            aria-label="Close"
            className="absolute top-3 right-3 inline-flex size-12 items-center justify-center rounded-full text-muted hover:bg-surface-2"
          >
            <X className="size-6" />
          </Dialog.Close>
          <Dialog.Title className="pr-12 text-2xl font-extrabold">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="mt-1 text-muted">{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          <div className="mt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
