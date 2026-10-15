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
 * Every genre branches into a sub-genre step, so every path is 4 taps — the
 * top of SPEC §2.1's 3–4 range, spent where it most sharpens the picks.
 *
 * `tmdb` hints drive the no-LLM fallback and must use ids verified against
 * the live TMDB API (genre ids are TMDB's; keyword ids via /search/keyword).
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
          next: "scifi-sub",
          tmdb: { genreIds: [878] },
        },
        {
          id: "thriller",
          label: "Thriller",
          emoji: "🕵️",
          hint: "Tension, twists, someone's lying",
          next: "thriller-sub",
          tmdb: { genreIds: [53] },
        },
        {
          id: "comedy",
          label: "Comedy",
          emoji: "😂",
          hint: "You want to laugh, that's it",
          next: "comedy-sub",
          tmdb: { genreIds: [35] },
        },
        {
          id: "drama",
          label: "Drama",
          emoji: "🎭",
          hint: "People, feelings, consequences",
          next: "drama-sub",
          tmdb: { genreIds: [18] },
        },
        {
          id: "action",
          label: "Action",
          emoji: "💥",
          hint: "Momentum and mayhem",
          next: "action-sub",
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

    "scifi-sub": {
      id: "scifi-sub",
      question: "Which corner of the future?",
      next: "era",
      options: [
        {
          id: "space",
          label: "Space & aliens",
          emoji: "🛸",
          hint: "Out there, and not alone",
          tmdb: { keywordIds: [9882, 9951] },
        },
        {
          id: "dystopia",
          label: "Dystopias",
          emoji: "🏙️",
          hint: "Societies gone wrong",
          tmdb: { keywordIds: [4565] },
        },
        {
          id: "mind-bend",
          label: "Time & mind-benders",
          emoji: "🌀",
          hint: "Loops, paradoxes, unreliable reality",
          tmdb: { keywordIds: [4379] },
        },
        {
          id: "ai-tech",
          label: "AI & machines",
          emoji: "🤖",
          hint: "What happens when it thinks back",
          tmdb: { keywordIds: [310, 14544] },
        },
      ],
    },

    "thriller-sub": {
      id: "thriller-sub",
      question: "What kind of tension?",
      next: "era",
      options: [
        {
          id: "crime",
          label: "Crime",
          emoji: "🚔",
          hint: "Cops, crooks, the grey in between",
          tmdb: { genreIds: [80] },
        },
        {
          id: "conspiracy",
          label: "Conspiracy",
          emoji: "🗂️",
          hint: "Trust no one, check the files",
          tmdb: { keywordIds: [10410] },
        },
        {
          id: "mystery",
          label: "Mystery",
          emoji: "🔎",
          hint: "A puzzle you can solve along",
          tmdb: { genreIds: [9648] },
        },
        {
          id: "survival",
          label: "Survival",
          emoji: "🏔️",
          hint: "Against the odds, against the clock",
          tmdb: { keywordIds: [10349] },
        },
      ],
    },

    "comedy-sub": {
      id: "comedy-sub",
      question: "What kind of funny?",
      next: "era",
      options: [
        {
          id: "feel-good",
          label: "Feel-good",
          emoji: "🌞",
          hint: "Warm, kind, leaves you smiling",
          tmdb: { keywordIds: [319357, 6054] },
        },
        {
          id: "romcom",
          label: "Rom-com",
          emoji: "💘",
          hint: "Meet-cutes and grand gestures",
          tmdb: { genreIds: [10749] },
        },
        {
          id: "dark",
          label: "Dark comedy",
          emoji: "🖤",
          hint: "Laughing when you probably shouldn't",
          tmdb: { keywordIds: [10123] },
        },
        {
          id: "absurd",
          label: "Absurd & satire",
          emoji: "🤪",
          hint: "Spoofs, sight gags, pure silliness",
          tmdb: { keywordIds: [8201, 9755, 11931, 9253] },
        },
      ],
    },

    "drama-sub": {
      id: "drama-sub",
      question: "What kind of story?",
      next: "era",
      options: [
        {
          id: "true-story",
          label: "True stories",
          emoji: "📰",
          hint: "It actually happened",
          tmdb: { keywordIds: [9672, 5565] },
        },
        {
          id: "romance",
          label: "Romance",
          emoji: "🌹",
          hint: "Love, longing, heartbreak",
          tmdb: { genreIds: [10749] },
        },
        {
          id: "family",
          label: "Family",
          emoji: "🏡",
          hint: "The people you can't choose",
          tmdb: { keywordIds: [10235] },
        },
        {
          id: "coming-of-age",
          label: "Coming of age",
          emoji: "🎒",
          hint: "Growing up, finding out",
          tmdb: { keywordIds: [10683] },
        },
      ],
    },

    "action-sub": {
      id: "action-sub",
      question: "What kind of action?",
      next: "era",
      options: [
        {
          id: "heist",
          label: "Heists",
          emoji: "💰",
          hint: "The plan, the crew, the twist",
          tmdb: { keywordIds: [10051] },
        },
        {
          id: "martial-arts",
          label: "Martial arts",
          emoji: "🥋",
          hint: "Choreography that hits",
          tmdb: { keywordIds: [779] },
        },
        {
          id: "war",
          label: "War",
          emoji: "🎖️",
          hint: "Front lines and hard choices",
          tmdb: { genreIds: [10752] },
        },
        {
          id: "blockbuster",
          label: "Blockbusters",
          emoji: "🎆",
          hint: "Big screen, big set pieces",
          tmdb: { genreIds: [12] },
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
