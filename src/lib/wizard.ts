/**
 * Types and traversal for the mood wizard. The tree itself is data and lives in
 * `src/config/steps.ts` — adding a genre or a question is a config edit and must
 * never require touching a component (CLAUDE.md rule 3).
 */

export type StepId = string;

export type WizardOption = {
  /**
   * Stable identifier. It ends up in `WizardAnswers.byStep`, which F-05 hashes
   * into `pathHash` for the shared 7-day cache — renaming one silently
   * invalidates every cached session on that path.
   */
  id: string;
  /** Shown on the tile, and the segment used to build `readablePath`. */
  label: string;
  emoji: string;
  hint?: string;
  /** Branch to a specific step. Falls back to the step's own `next`. */
  next?: StepId;
};

export type WizardStep = {
  id: StepId;
  question: string;
  subtitle?: string;
  options: WizardOption[];
  /** Default successor for options that don't branch. Absent = terminal step. */
  next?: StepId;
};

export type StepTree = {
  rootId: StepId;
  steps: Record<StepId, WizardStep>;
};

/** One answered step, in the order it was answered. */
export type WizardPick = {
  stepId: StepId;
  optionId: string;
};

export type WizardAnswers = {
  steps: { stepId: StepId; optionId: string; label: string }[];
  /** Normalized map — the input F-05 hashes into `pathHash` (SPEC §3). */
  byStep: Record<StepId, string>;
  /**
   * Prompt-ready path, e.g. "Horror > Demons & possession > Modern (2010+) > Slow-burn".
   * Interpolated as `{answersAsReadablePath}` in Template A (docs/PROMPTS.md).
   */
  readablePath: string;
};

export const PATH_SEPARATOR = " > ";

export function getStep(tree: StepTree, stepId: StepId): WizardStep {
  const step = tree.steps[stepId];
  if (!step) {
    throw new Error(`Unknown wizard step: "${stepId}"`);
  }
  return step;
}

export function getOption(tree: StepTree, stepId: StepId, optionId: string): WizardOption {
  const option = getStep(tree, stepId).options.find((candidate) => candidate.id === optionId);
  if (!option) {
    throw new Error(`Unknown option "${optionId}" on step "${stepId}"`);
  }
  return option;
}

/**
 * Where a pick leads. Option-level `next` wins, then the step's default, then
 * `null` for "the wizard is finished".
 */
export function resolveNext(tree: StepTree, stepId: StepId, optionId: string): StepId | null {
  return getOption(tree, stepId, optionId).next ?? getStep(tree, stepId).next ?? null;
}

/**
 * Steps remaining from `stepId` inclusive, along the longest branch. Progress
 * dots need this because branches differ in length — horror is 4 taps, every
 * other genre is 3.
 */
export function maxDepthFrom(tree: StepTree, stepId: StepId): number {
  const memo = new Map<StepId, number>();
  const visiting = new Set<StepId>();

  const walk = (id: StepId): number => {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;

    // A mis-authored `next` should fail loudly at render, not hang the wizard.
    if (visiting.has(id)) {
      throw new Error(`Cycle in wizard step tree at "${id}"`);
    }
    visiting.add(id);

    const step = getStep(tree, id);
    let deepest = 0;
    for (const option of step.options) {
      const nextId = option.next ?? step.next ?? null;
      if (nextId !== null) {
        deepest = Math.max(deepest, walk(nextId));
      }
    }

    visiting.delete(id);
    const depth = deepest + 1;
    memo.set(id, depth);
    return depth;
  };

  return walk(stepId);
}

/** Turn the ordered picks into the object F-05 consumes. */
export function buildAnswers(tree: StepTree, picks: readonly WizardPick[]): WizardAnswers {
  const steps = picks.map((pick) => ({
    stepId: pick.stepId,
    optionId: pick.optionId,
    label: getOption(tree, pick.stepId, pick.optionId).label,
  }));

  return {
    steps,
    byStep: Object.fromEntries(steps.map((step) => [step.stepId, step.optionId])),
    readablePath: steps.map((step) => step.label).join(PATH_SEPARATOR),
  };
}
