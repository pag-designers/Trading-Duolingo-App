import { LearnScreen } from "@/components/path/learn-screen";
import { getOutlineWithReadiness } from "@/server/content";

export default function LearnPage() {
  return <LearnScreen outline={getOutlineWithReadiness()} />;
}
