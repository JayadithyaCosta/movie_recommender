"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildAnswers,
  getStep,
  maxDepthFrom,
  resolveNext,
  type StepId,
  type StepTree,
  type WizardAnswers,
  type WizardPick,
  type WizardStep,
} from "@/lib/wizard";

/** Marker written into history.state so we can tell our entries from the router's. */
const DEPTH_KEY = "wizardDepth";

type WizardState =
  | { status: "asking"; stepId: StepId }
  | { status: "complete"; answers: WizardAnswers };

export type UseWizard = {
  state: WizardState;
  step: WizardStep | null;
  picks: readonly WizardPick[];
  /** 1-based position of the current step. */
  stepNumber: number;
  /** Answered so far + longest remaining branch. Grows only if a branch is longer. */
  totalSteps: number;
  /** +1 forward, -1 backward — drives the slide direction. */
  direction: 1 | -1;
  canGoBack: boolean;
  select: (optionId: string) => void;
  back: () => void;
  restart: () => void;
};

function readDepth(state: unknown): number | null {
  if (typeof state !== "object" || state === null) return null;
  const depth = (state as Record<string, unknown>)[DEPTH_KEY];
  return typeof depth === "number" ? depth : null;
}

/**
 * Wizard navigation. Answers live in client state (PLAN.md Phase 1); history is
 * used only so the phone's back button retreats one step instead of dumping the
 * user out of the app with their answers lost.
 *
 * The in-UI back arrow calls `history.back()` rather than mutating state
 * directly, so both routes into "go back" run the same code path and can't
 * double-pop.
 */
export function useWizard(tree: StepTree): UseWizard {
  const [picks, setPicks] = useState<WizardPick[]>([]);
  const [direction, setDirection] = useState<1 | -1>(1);

  // Mirrors `picks.length` for the popstate handler, which must not re-subscribe
  // on every pick (that would drop events mid-transition).
  const depthRef = useRef(0);
  depthRef.current = picks.length;

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const depth = readDepth(event.state);

      // No marker means this entry isn't ours — the user navigated away from
      // /discover entirely. Let the router handle it.
      if (depth === null) return;
      if (depth >= depthRef.current) return;

      setDirection(-1);
      setPicks((current) => current.slice(0, depth));
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const select = useCallback(
    (optionId: string) => {
      const last = picks.at(-1);
      const stepId: StepId | null = last
        ? resolveNext(tree, last.stepId, last.optionId)
        : tree.rootId;

      // Already finished — ignore stray taps during the exit animation.
      if (stepId === null) return;

      const next = [...picks, { stepId, optionId }];
      setDirection(1);
      setPicks(next);
      // Deliberately outside the state updater: StrictMode invokes updaters
      // twice in dev, which would push two history entries per tap.
      window.history.pushState({ [DEPTH_KEY]: next.length }, "");
    },
    [tree, picks],
  );

  const back = useCallback(() => {
    window.history.back();
  }, []);

  /**
   * Unwind every entry this wizard pushed in one go, so "start over" doesn't
   * leave a trail of steps behind the phone's back button.
   */
  const restart = useCallback(() => {
    if (picks.length === 0) return;
    window.history.go(-picks.length);
  }, [picks.length]);

  const state = useMemo<WizardState>(() => {
    let stepId: StepId | null = tree.rootId;
    for (const pick of picks) {
      if (stepId === null) break;
      stepId = resolveNext(tree, pick.stepId, pick.optionId);
    }

    return stepId === null
      ? { status: "complete", answers: buildAnswers(tree, picks) }
      : { status: "asking", stepId };
  }, [tree, picks]);

  const step = state.status === "asking" ? getStep(tree, state.stepId) : null;

  const totalSteps =
    state.status === "asking" ? picks.length + maxDepthFrom(tree, state.stepId) : picks.length;

  return {
    state,
    step,
    picks,
    stepNumber: picks.length + 1,
    totalSteps,
    direction,
    canGoBack: picks.length > 0,
    select,
    back,
    restart,
  };
}
