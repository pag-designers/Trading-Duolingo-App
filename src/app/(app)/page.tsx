import { LearnScreen } from "@/components/path/learn-screen";
import { getOutline } from "@/lib/content/outline";

export default function LearnPage() {
  return <LearnScreen outline={getOutline()} />;
}
