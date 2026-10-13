import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonRoute } from "@/components/lesson/lesson-route";
import { getLessonBundle, getOpenableNodeIds } from "@/server/content";

interface Props {
  params: Promise<{ nodeId: string }>;
}

export function generateStaticParams() {
  return getOpenableNodeIds().map((nodeId) => ({ nodeId }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { nodeId } = await params;
  const bundle = getLessonBundle(nodeId);
  return { title: bundle?.node.title ?? "Lesson" };
}

export default async function LessonPage({ params }: Props) {
  const { nodeId } = await params;
  const bundle = getLessonBundle(nodeId);
  if (!bundle) notFound();
  return <LessonRoute {...bundle} />;
}
