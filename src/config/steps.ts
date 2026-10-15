import type { StepTree } from "@/lib/wizard";

/**
 * The wizard, as data. Every step, branch and option lives here — components
 * render whatever this tree says (CLAUDE.md rule 3), so adding a genre or a
 * whole new question means editing this file and nothing else.
 *
 * Shape rules:
 * - An option's `next` branches; otherwise the step's `next` applies.
 * - A step with no `next` and no branching options ends the wizard.
 * - Option `id`s feed `pathHash` in F-05 — treat them as a stable contract.
 *
 * Only Horror sub-branches today, so paths are 3 taps (4 for horror), which is
 * the 3–4 taps SPEC §2.1 asks for.
 */
export const STEP_TREE: StepTree = {
  rootId: "genre",
  steps: {
    genre: {
      id: "genre",
      question: "What do you feel like tonight?",
      subtitle: "Pick the mood, not the movie.",
      next: "era",
      options: [
        {
          id: "horror",
          label: "Horror",
          emoji: "🩸",
          hint: "Something that gets under your skin",
          next: "horror-sub",
          tmdb: { genreIds: [27] },
        },
        {
          id: "scifi",
          label: "Sci-Fi",
          emoji: "🚀",
          hint: "Big ideas, other worlds",
          tmdb: { genreIds: [878] },
        },
        {
          id: "thriller",
          label: "Thriller",
          emoji: "🕵️",
          hint: "Tension, twists, someone's lying",
          tmdb: { genreIds: [53] },
        },
        {
          id: "comedy",
          label: "Comedy",
          emoji: "😂",
          hint: "You want to laugh, that's it",
          tmdb: { genreIds: [35] },
        },
        {
          id: "drama",
          label: "Drama",
          emoji: "🎭",
          hint: "People, feelings, consequences",
          tmdb: { genreIds: [18] },
        },
        {
          id: "action",
          label: "Action",
          emoji: "💥",
          hint: "Momentum and mayhem",
          tmdb: { genreIds: [28] },
        },
      ],
    },

    "horror-sub": {
      id: "horror-sub",
      question: "What kind of scared?",
      next: "era",
      options: [
        {
          id: "ghosts",
          label: "Ghosts & hauntings",
          emoji: "👻",
          hint: "Creaks, cold spots, dread",
          tmdb: { keywordIds: [3358, 162846] },
        },
        {
          id: "demons",
          label: "Demons & possession",
          emoji: "😈",
          hint: "Rituals and things that wear a face",
          tmdb: { keywordIds: [161261, 2626] },
        },
        {
          id: "slashers",
          label: "Slashers",
          emoji: "🔪",
          hint: "Someone is in the house",
          tmdb: { keywordIds: [12339, 10714] },
        },
        {
          id: "psychological",
          label: "Psychological",
          emoji: "🧠",
          hint: "The horror is coming from inside",
          tmdb: { keywordIds: [295907] },
        },
      ],
    },

    era: {
      id: "era",
      question: "From when?",
      next: "pacing",
      options: [
        {
          id: "classics",
          label: "Classics",
          emoji: "🎞️",
          hint: "Pre-90s, the canon",
          tmdb: { yearTo: 1989 },
        },
        {
          id: "90s-00s",
          label: "90s–00s",
          emoji: "📼",
          hint: "Video store era",
          tmdb: { yearFrom: 1990, yearTo: 2009 },
        },
        {
          id: "modern",
          label: "Modern (2010+)",
          emoji: "✨",
          hint: "The last decade and a half",
          tmdb: { yearFrom: 2010 },
        },
        {
          id: "surprise",
          label: "Surprise me",
          emoji: "🎲",
          hint: "No era preference",
        },
      ],
    },

    // Terminal step — no `next`, so answering it completes the wizard.
    pacing: {
      id: "pacing",
      question: "How should it move?",
      options: [
        {
          id: "slow-burn",
          label: "Slow-burn",
          emoji: "🕯️",
          hint: "Let it build, I'm patient",
          tmdb: { sortBy: "vote_average.desc" },
        },
        {
          id: "balanced",
          label: "Balanced",
          emoji: "⚖️",
          hint: "Steady, no dead air",
          tmdb: { sortBy: "vote_count.desc" },
        },
        {
          id: "intense",
          label: "Intense",
          emoji: "⚡",
          hint: "Grab me by the collar",
          tmdb: { sortBy: "popularity.desc" },
        },
      ],
    },
  },
};
