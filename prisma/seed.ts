/**
 * Demo data (F-13): `make seed` turns an empty database into a demo-able app.
 *
 * Creates `demo@movierecs.test` with two wizard sessions, a For You batch,
 * a few ratings, a watchlist and a written taste profile. Movies are resolved
 * through the real TMDB client, so every displayed field is verified data
 * (CLAUDE.md rule 1) — the reasons are hand-written demo copy.
 *
 * Idempotent: seed sessions use fixed ids and are replaced on every run.
 * Sign in as the demo user via the dev magic link on /login.
 */

import type { Prisma, Signal } from "@prisma/client";

import { db } from "../src/lib/db";
import { resolveCandidate } from "../src/lib/tmdb";

const DEMO_EMAIL = "demo@movierecs.test";

type SeedPick = { title: string; year: number; reason: string };

const SESSIONS: {
  id: string;
  type: "WIZARD" | "FOR_YOU";
  daysAgo: number;
  path?: { steps: { stepId: string; optionId: string; label: string }[] };
  picks: SeedPick[];
}[] = [
  {
    id: "seed-wizard-horror",
    type: "WIZARD",
    daysAgo: 3,
    path: {
      steps: [
        { stepId: "genre", optionId: "horror", label: "Horror" },
        { stepId: "horror-sub", optionId: "psychological", label: "Psychological" },
        { stepId: "era", optionId: "modern", label: "Modern (2010+)" },
        { stepId: "pacing", optionId: "slow-burn", label: "Slow-burn" },
      ],
    },
    picks: [
      { title: "Hereditary", year: 2018, reason: "Grief curdles into dread so slowly you won't notice the floor dropping away." },
      { title: "The Witch", year: 2015, reason: "A patient, candle-lit descent where the scariest thing is a family turning on itself." },
      { title: "It Follows", year: 2014, reason: "Relentless but quiet — a single idea stretched into ninety minutes of looking over your shoulder." },
      { title: "The Babadook", year: 2014, reason: "Psychological horror at its rawest: the monster and the mourning are the same thing." },
      { title: "Saint Maud", year: 2019, reason: "The lesser-known gem — an unnerving, intimate slow burn that ends with a gut punch." },
    ],
  },
  {
    id: "seed-wizard-scifi",
    type: "WIZARD",
    daysAgo: 1,
    path: {
      steps: [
        { stepId: "genre", optionId: "scifi", label: "Sci-Fi" },
        { stepId: "scifi-sub", optionId: "mind-bend", label: "Time & mind-benders" },
        { stepId: "era", optionId: "modern", label: "Modern (2010+)" },
        { stepId: "pacing", optionId: "balanced", label: "Balanced" },
      ],
    },
    picks: [
      { title: "Arrival", year: 2016, reason: "A time puzzle with a beating heart — cerebral but never cold." },
      { title: "Inception", year: 2010, reason: "Layered dream logic delivered at a steady clip, with set pieces to spare." },
      { title: "Coherence", year: 2013, reason: "The hidden gem: one dinner party, infinite versions, zero budget, maximum paranoia." },
      { title: "Edge of Tomorrow", year: 2014, reason: "Groundhog Day with exosuits — the loop is the fun, and it never drags." },
      { title: "Predestination", year: 2014, reason: "A paradox that keeps folding in on itself until the final, dizzying reveal." },
    ],
  },
  {
    id: "seed-for-you",
    type: "FOR_YOU",
    daysAgo: 0,
    picks: [
      { title: "Annihilation", year: 2018, reason: "Your love of slow dread meets your taste for big sci-fi ideas." },
      { title: "Ex Machina", year: 2015, reason: "A tense, intimate three-hander — exactly the controlled pacing you go for." },
      { title: "The Lighthouse", year: 2019, reason: "Adventurous pick: stranger than your usual, but pure psychological unravelling." },
      { title: "Midsommar", year: 2019, reason: "Daylight horror from the director of a film you loved — grief, again, gone very wrong." },
      { title: "Under the Skin", year: 2013, reason: "Hypnotic and minimal; sci-fi that feels like a slow-burn horror film." },
    ],
  },
];

const FEEDBACK: { title: string; year: number; signal: Signal }[] = [
  { title: "Hereditary", year: 2018, signal: "LOVED" },
  { title: "Arrival", year: 2016, signal: "LOVED" },
  { title: "Inception", year: 2010, signal: "SEEN" },
  { title: "It Follows", year: 2014, signal: "NOT_FOR_ME" },
];

const SAVED = [
  { title: "Saint Maud", year: 2019 },
  { title: "Coherence", year: 2013 },
];

const TASTE_SUMMARY =
  "They love slow-burn, psychological horror where grief or isolation drives the dread — Hereditary is a favourite — and cerebral modern sci-fi like Arrival that pairs big ideas with emotion. They prefer patient pacing and atmosphere over jump scares, lean toward post-2010 films, and aren't fond of high-concept horror that relies on a single gimmick, like It Follows.";

async function movieId(title: string, year: number): Promise<number> {
  const movie = await resolveCandidate({ title, year });
  if (!movie) throw new Error(`Seed movie did not resolve on TMDB: ${title} (${year})`);
  return movie.id;
}

async function main() {
  const user = await db.user.upsert({
    where: { email: DEMO_EMAIL },
    create: { email: DEMO_EMAIL, name: "Demo Viewer", emailVerified: new Date() },
    update: { name: "Demo Viewer" },
  });

  for (const session of SESSIONS) {
    const ids = await Promise.all(session.picks.map((p) => movieId(p.title, p.year)));
    const createdAt = new Date(Date.now() - session.daysAgo * 24 * 60 * 60 * 1000);
    const answers = session.path
      ? ({
          steps: session.path.steps,
          byStep: Object.fromEntries(session.path.steps.map((s) => [s.stepId, s.optionId])),
          readablePath: session.path.steps.map((s) => s.label).join(" > "),
          source: "llm",
        } satisfies Prisma.InputJsonValue)
      : undefined;

    await db.recSession.deleteMany({ where: { id: session.id } });
    await db.recSession.create({
      data: {
        id: session.id,
        userId: user.id,
        type: session.type,
        answers,
        createdAt,
        movies: {
          create: session.picks.map((pick, index) => ({
            movieId: ids[index]!,
            reason: pick.reason,
            rank: index + 1,
          })),
        },
      },
    });
  }

  for (const f of FEEDBACK) {
    const id = await movieId(f.title, f.year);
    await db.movieFeedback.upsert({
      where: { userId_movieId: { userId: user.id, movieId: id } },
      create: { userId: user.id, movieId: id, signal: f.signal },
      update: { signal: f.signal },
    });
  }

  for (const s of SAVED) {
    const id = await movieId(s.title, s.year);
    await db.savedMovie.upsert({
      where: { userId_movieId: { userId: user.id, movieId: id } },
      create: { userId: user.id, movieId: id },
      update: {},
    });
  }

  await db.tasteProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, tasteSummary: TASTE_SUMMARY, genreWeights: { horror: 0.4, "sci-fi": 0.6 }, signalCount: 0 },
    update: { tasteSummary: TASTE_SUMMARY, genreWeights: { horror: 0.4, "sci-fi": 0.6 }, signalCount: 0 },
  });

  const [users, movies, sessions] = await Promise.all([db.user.count(), db.movie.count(), db.recSession.count()]);
  console.log(`Seeded ${DEMO_EMAIL}. users=${users} movies=${movies} sessions=${sessions}`);
  console.log("Sign in at /login with that email — in dev the magic link prints to the server log.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
