import type { Metadata } from "next";
import { GlossaryScreen } from "@/components/glossary/glossary-screen";
import { getGlossaryData } from "@/server/content";

export const metadata: Metadata = { title: "Glossary" };

export default async function GlossaryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const data = getGlossaryData();
  return (
    <GlossaryScreen
      terms={data.terms}
      abbreviations={data.abbreviations}
      lessonRefs={data.lessonRefs}
      initialTab={tab === "short" ? "short" : "words"}
    />
  );
}
