import type { ReactNode } from "react";
import { Wick, type Mood } from "@/components/mascot/wick";

interface EmptyStateProps {
  mood?: Mood;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

/** A friendly, honest "not ready yet" screen. Always says what is coming and why. */
export function EmptyState({ mood = "think", title, children, action }: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-10 text-center">
      <Wick mood={mood} size={140} decorative />
      <h1 className="text-3xl">{title}</h1>
      <div className="space-y-2 text-lg text-muted">{children}</div>
      {action}
    </div>
  );
}
