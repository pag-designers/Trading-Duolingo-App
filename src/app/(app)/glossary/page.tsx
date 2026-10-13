import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Glossary" };

export default function GlossaryPage() {
  return (
    <EmptyState mood="think" title="Your glossary starts empty">
      <p>
        Every new word gets a plain meaning, a picture in your head, and an example. They collect
        here as you learn, and you can search them.
      </p>
      <p className="text-base">The first words arrive with Unit 1.</p>
    </EmptyState>
  );
}
