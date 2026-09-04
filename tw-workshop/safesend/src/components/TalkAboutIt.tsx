import { COPY } from '../copy';

/**
 * Direct accusation entrenches the person being targeted. This panel is the
 * part of the flow that most affects the real-world outcome.
 */
export function TalkAboutIt() {
  return (
    <section className="rounded-xl border-2 border-blue-800 bg-blue-50 p-5" aria-labelledby="talk-heading">
      <h2 id="talk-heading" className="text-xl font-bold text-blue-950">
        {COPY.approver.talkHeading}
      </h2>
      <p className="mt-2 text-blue-950">{COPY.approver.talkIntro}</p>
      <ul className="mt-3 space-y-2">
        {COPY.approver.talkQuestions.map((question) => (
          <li key={question} className="rounded-lg bg-white p-3 text-blue-950">
            “{question}”
          </li>
        ))}
      </ul>
    </section>
  );
}
