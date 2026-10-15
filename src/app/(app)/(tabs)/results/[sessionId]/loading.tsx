import { Curating } from "@/components/wizard/curating";

/** Covers the hop from the wizard's POST to the rendered results. */
export default function ResultsLoading() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-6">
      <Curating label="Almost there" />
    </main>
  );
}
