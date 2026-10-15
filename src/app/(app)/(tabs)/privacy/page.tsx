import type { Metadata } from "next";

import { CONTACT_EMAIL, LegalPage } from "@/components/ui/legal";

export const metadata: Metadata = { title: "Privacy · Movie Recs" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        Movie Recs is a small personal project that suggests movies. It collects as little as it
        can and never sells or shares your data for advertising.
      </p>

      <section className="space-y-2">
        <h2>What we store</h2>
        <ul>
          <li>
            <strong>Google sign-in:</strong> your name, email address and profile picture, used only
            to identify your account.
          </li>
          <li>
            <strong>Your activity:</strong> the moods you pick, the recommendations you get, and your
            feedback (saved, seen, not for me, ratings) — this is what powers your For You feed.
          </li>
          <li>
            <strong>Cookies:</strong> a session cookie to keep you signed in, and an anonymous cookie
            so picks made before signing in can be added to your account.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2>Who else sees it</h2>
        <p>
          Your taste signals (genres, moods and movie titles — never your name or email) are sent to
          an AI model provider (Google Gemini) to generate suggestions. Movie details and posters come
          from TMDB. Data is hosted on Vercel and Neon.
        </p>
      </section>

      <section className="space-y-2">
        <h2>Deleting your data</h2>
        <p>
          Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and your account and all its
          history will be deleted. You can also revoke access any time from your Google Account
          settings.
        </p>
      </section>

      <p className="text-sm">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </LegalPage>
  );
}
