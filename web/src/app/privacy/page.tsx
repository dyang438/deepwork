import type { Metadata } from "next";

import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy · The Garden" };

const CONTACT = "davidyang438@gmail.com";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="October 25, 2026">
      <p>
        The Garden (deepwork.garden) is a small personal project by David Yang for timing and logging deep work. This page
        explains what it collects, why, and how to get it removed. It does not show ads and does not sell or rent anyone&apos;s data.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account.</strong> When you sign in with Google or with email and a password, we store your name, email
          address and, for Google sign-in, your Google account ID and profile picture link. Passwords are stored only as hashes.
          Sign-in is handled by Neon Auth.
        </li>
        <li>
          <strong>Your sessions.</strong> For each deep work session: the goal you typed, start time, length in minutes,
          outcome (done / partial / not done), the focus rating you chose, and any notes you write. Also the text you write in
          Philosophy and your default settings (session length, outcome, focus).
        </li>
        <li>
          <strong>The deepwork command-line tool (optional).</strong> If you connect it with <code>deepwork login</code>, we
          store a token (only as a hash) that lets it upload your finished sessions (goal, start time, minutes, outcome,
          focus) and show a running session on the dashboard. If you install its background agent, we also store your
          Mac&apos;s hostname and when it last checked in, plus the start/stop requests you send from the site. Everything
          else the tool records (app usage samples, blocked-site counts, your local log) stays on your Mac.
        </li>
        <li>
          <strong>Competitions.</strong> If you create or join a competition, its members can see your name, your total deep
          hours, session count and average focus rating for sessions since the competition started. They do not see your
          goals or notes.
        </li>
        <li>
          <strong>Calendar feed (optional).</strong> If you use &ldquo;Google Cal&rdquo; on the today timeline, we create a
          private web address that serves your sessions as calendar events (goal, time, outcome, focus and notes). Anyone who
          has that address can read it, so treat it like a password.
        </li>
        <li>
          <strong>Technical data.</strong> A sign-in cookie to keep you logged in, a small local-storage setting in your
          browser, and the standard request logs kept by our hosting providers.
        </li>
      </ul>

      <h2>Google Calendar (optional)</h2>
      <p>
        You can choose to connect Google Calendar. It is never required: you can sign in and use everything else if you decline.
        If you connect it, we ask Google for read-only access (the <code>calendar.events.readonly</code> and{" "}
        <code>calendar.calendarlist.readonly</code> permissions) and use it for one purpose: to find your next upcoming busy
        event so the site can suggest a session that ends five minutes before it and show a note like &ldquo;Standup begins
        at 3:00&nbsp;PM&rdquo;.
      </p>
      <ul>
        <li>We read your calendar list and upcoming events (titles, times and whether you are busy). We never create, change or delete calendar events.</li>
        <li>
          The access and refresh tokens Google issues are stored with your account in our database (by our sign-in provider,
          and by the site itself for the Calendar connection) so the site can check
          your calendar while you use it. We do not keep a copy of your events beyond what is needed to show the suggestion.
        </li>
        <li>Calendar data is not shown to other users, not used for advertising, and not sold or shared, except with the service providers below as needed to run the site.</li>
        <li>
          You can disconnect it any time from the settings menu (the gear), which revokes the grant at Google and deletes
          our copy of the tokens, or at{" "}
          <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>; the site then stops
          reading your calendar and works without it.
        </li>
      </ul>
      <p>
        The Garden&apos;s use and transfer of information received from Google APIs adheres to the{" "}
        <a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>,
        including the Limited Use requirements.
      </p>

      <h2>Who processes it</h2>
      <ul>
        <li>Vercel hosts the website.</li>
        <li>Neon stores the database and runs sign-in.</li>
        <li>Cloudflare provides the domain&apos;s DNS and network routing.</li>
        <li>Google provides Google sign-in and, if you connect it, Calendar access.</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        Your account and sessions are kept until you delete them or ask us to delete your account. You can delete individual
        sessions on the dashboard at any time.
      </p>

      <h2>Deleting your data</h2>
      <p>
        To delete your account and everything attached to it (sessions, notes, settings, competition memberships, tokens and
        any stored Google tokens), email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> from the address you signed in with.
        To disconnect the command-line tool, run <code>deepwork logout</code>.
      </p>

      <h2>Changes and contact</h2>
      <p>
        If this page changes, the date at the top changes too. Questions: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </LegalPage>
  );
}
