import { COPY } from '../copy';

/**
 * Direct accusation entrenches the person being targeted. This panel is the
 * part of the flow that most affects the real-world outcome.
 */
export function TalkAboutIt() {
  return (
    <section className="rounded-card border-2 border-attend-border bg-attend-bg p-5" aria-labelledby="talk-heading">
      <h2 id="talk-heading" className="text-xl font-bold text-ink">
        {COPY.approver.talkHeading}
      </h2>
      <p className="mt-2 text-ink">{COPY.approver.talkIntro}</p>
      <ul className="mt-3 space-y-2">
        {COPY.approver.talkQuestions.map((question) => (
          <li key={question} className="rounded-ctl bg-surface p-3 text-ink">
            “{question}”
          </li>
        ))}
      </ul>
    </section>
  );
}
