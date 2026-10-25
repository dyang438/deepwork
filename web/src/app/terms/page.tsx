import type { Metadata } from "next";

import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms · The Garden" };

const CONTACT = "davidyang438@gmail.com";

export default function TermsPage() {
  return (
    <LegalPage title="Terms" updated="October 25, 2026">
      <p>
        The Garden (deepwork.garden) and the deepwork command-line tool are a free personal project by David Yang. By using
        them you agree to these terms. If you don&apos;t agree, please don&apos;t use them.
      </p>

      <h2>The service</h2>
      <p>
        The Garden helps you time, log and review deep work sessions, compete with friends on deep hours, and, if you connect
        it, look at your Google Calendar to suggest how long a session can run. It is a hobby project: it may change, break,
        lose features or shut down at any time, with or without notice.
      </p>

      <h2>Your account and content</h2>
      <ul>
        <li>Keep your sign-in, your command-line token and your private calendar feed address to yourself. You are responsible for what happens under your account.</li>
        <li>You own what you write (goals, notes, Philosophy). You let us store and display it so the site can work, including showing your name and totals to members of competitions you join.</li>
        <li>You can delete sessions yourself, and ask for your whole account to be deleted as described in the <a href="/privacy">privacy page</a>.</li>
      </ul>

      <h2>Fair use</h2>
      <ul>
        <li>Don&apos;t misuse the site: no attempts to access other people&apos;s data, overload or break the service, or use it for anything unlawful.</li>
        <li>
          Competitions run on the honor system. Nobody verifies anyone&apos;s hours, so the leaderboard is only as honest as
          its members. Please don&apos;t cheat yourself.
        </li>
        <li>We may remove content or close accounts that break these terms.</li>
      </ul>

      <h2>The command-line tool</h2>
      <p>
        The deepwork tool is open source under the MIT license (
        <a href="https://github.com/dyang438/deepwork">github.com/dyang438/deepwork</a>). It runs on your Mac and can quit
        apps, turn on Do Not Disturb, pause music and block websites while a session runs, and its optional agent can start
        and stop sessions you request from the site. You choose what it does through its settings.
      </p>

      <h2>No warranty</h2>
      <p>
        The site and the tool are provided &ldquo;as is&rdquo;, without warranties of any kind. To the extent the law allows,
        David Yang is not liable for any loss arising from using them, including lost data, missed notifications or missed
        calendar events.
      </p>

      <h2>Google services</h2>
      <p>
        Google sign-in and the optional Calendar connection are also subject to Google&apos;s own terms. How we handle
        Google data is described in the <a href="/privacy">privacy page</a>.
      </p>

      <h2>Changes and contact</h2>
      <p>
        If these terms change, the date at the top changes too; continuing to use the site means you accept the new version.
        Questions: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </LegalPage>
  );
}
