import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/Layout';
import { COPY } from '../../copy';
import { CONFIG } from '../../config';
import { DEMO_PINS } from '../../data/seed';
import { useApp } from '../../state/AppStateProvider';
import type { Persona } from '../../types';

const PERSONAS: Array<{
  persona: Persona;
  name: string;
  role: string;
  detail: string;
  home: string;
}> = [
  {
    persona: 'margaret',
    name: 'Margaret Whitfield, 78',
    role: COPY.roles.sender,
    detail: 'Simple mode: large type, one thing per screen.',
    home: '/m',
  },
  {
    persona: 'david',
    name: 'David Whitfield, 49',
    role: `${COPY.roles.approver} (son)`,
    detail: 'Standard mode: a denser dashboard with the full risk report.',
    home: '/d',
  },
];

export function Landing() {
  const { dispatch } = useApp();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Persona | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const chosen = PERSONAS.find((p) => p.persona === selected);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!chosen) return;
    if (pin.trim() !== DEMO_PINS[chosen.persona]) {
      setError(COPY.landing.pinWrong);
      return;
    }
    dispatch({ type: 'UNLOCK', persona: chosen.persona });
    navigate(chosen.home);
  }

  return (
    <AppShell persona={null} title={COPY.landing.heading}>
      <div className="space-y-8">
        <section>
          <h2 className="text-3xl">{COPY.landing.heading}</h2>
          <p className="mt-2 max-w-2xl text-lg">{COPY.app.tagline}</p>
          <p className="mt-2 max-w-2xl">{COPY.landing.intro}</p>
        </section>

        <section aria-labelledby="choose-heading" className="space-y-4">
          <h2 id="choose-heading" className="text-2xl">
            Who are you today?
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {PERSONAS.map((item) => (
              <div key={item.persona} className="card flex flex-col gap-2">
                <h3 className="text-xl font-bold">{item.name}</h3>
                <p className="font-semibold text-slate-700">{item.role}</p>
                <p className="text-slate-800">{item.detail}</p>
                <p className="text-sm text-slate-700">
                  Demo PIN <code className="rounded bg-slate-100 px-2 py-1">{DEMO_PINS[item.persona]}</code>
                </p>
                <button
                  type="button"
                  className="btn-primary mt-auto"
                  onClick={() => {
                    setSelected(item.persona);
                    setPin('');
                    setError('');
                  }}
                >
                  Enter as {item.name.split(' ')[0]}
                </button>
              </div>
            ))}
          </div>

          {chosen ? (
            <form onSubmit={submit} className="card max-w-md space-y-3">
              <h3 className="text-xl">{COPY.landing.pinPrompt}</h3>
              <label htmlFor="pin" className="block font-semibold">
                Demo PIN for {chosen.name.split(' ')[0]}
              </label>
              <input
                id="pin"
                name="pin"
                className="field"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={pin}
                onChange={(event) => {
                  setPin(event.target.value);
                  setError('');
                }}
                aria-describedby="pin-help"
                aria-invalid={error ? true : undefined}
              />
              <p id="pin-help" className="text-sm text-slate-700">
                {COPY.landing.pinHelp}
              </p>
              {error ? (
                <p role="alert" className="font-semibold text-red-800">
                  {error}
                </p>
              ) : null}
              <button type="submit" className="btn-primary">
                Continue
              </button>
            </form>
          ) : null}

          <p className="text-slate-800">
            <button
              type="button"
              className="link"
              onClick={() => window.open(window.location.origin, '_blank', 'noopener')}
            >
              {COPY.landing.openBoth}
            </button>{' '}
            — open a second tab, enter as the other person, and watch both update live.
          </p>
        </section>

        <section aria-labelledby="how-heading" className="card">
          <h2 id="how-heading" className="text-2xl">
            {COPY.landing.howItWorks}
          </h2>
          <ul className="mt-3 space-y-2">
            {COPY.landing.howItWorksBody.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden="true">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-700">
            Everything is stored in this browser only, under{' '}
            <code>{CONFIG.storageKey}</code>. Nothing is sent anywhere.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
