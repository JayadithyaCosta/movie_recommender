import type { Metadata } from "next";

import { Wizard } from "@/components/wizard/wizard";
import { STEP_TREE } from "@/config/steps";

export const metadata: Metadata = {
  title: "What do you feel like? · Movie Recs",
};

export default function DiscoverPage() {
  return <Wizard tree={STEP_TREE} />;
}
