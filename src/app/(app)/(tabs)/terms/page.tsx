import type { Metadata } from "next";
import Link from "next/link";

import { CONTACT_EMAIL, LegalPage } from "@/components/ui/legal";

export const metadata: Metadata = { title: "Terms · Movie Recs" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service">
      <p>
        Movie Recs is a free, personal project offered as-is. By using it you agree to these terms.
      </p>

      <section className="space-y-2">
        <h2>The service</h2>
        <ul>
          <li>Recommendations are suggestions generated with AI and may be imperfect.</li>
          <li>The app may change, pause or shut down at any time, without notice.</li>
          <li>It comes with no warranty, and we aren&apos;t liable for how you use it.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2>Fair use</h2>
        <p>Don&apos;t abuse, scrape or attempt to disrupt the service.</p>
      </section>

      <section className="space-y-2">
        <h2>Your data</h2>
        <p>
          See the <Link href="/privacy">privacy policy</Link>. Questions:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>

      <p className="text-sm">
        Movie data and images are provided by TMDB. This product uses the TMDB API but is not
        endorsed or certified by TMDB.
      </p>
    </LegalPage>
  );
}
