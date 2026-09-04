import { Link, NavLink, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { COPY } from '../copy';
import { useApp } from '../state/AppStateProvider';
import { unreadCount } from '../state/selectors';
import { DemoBanner } from './DemoBanner';
import { NotificationBell } from './NotificationBell';
import { ErrorState } from './ErrorState';
import { now } from '../clock';
import type { Persona } from '../types';

const SENDER_NAV = [
  { to: '/m', label: 'Home', end: true },
  { to: '/m/activity', label: 'Payments' },
  { to: '/m/helpers', label: 'Who helps me' },
  { to: '/m/help', label: 'Is this a scam?' },
  { to: '/audit', label: 'What has happened' },
];

const APPROVER_NAV = [
  { to: '/d', label: 'Approvals', end: true },
  { to: '/d/notifications', label: 'Messages' },
  { to: '/d/settings', label: 'Settings' },
  { to: '/audit', label: 'Audit log' },
];

export function AppShell({
  persona,
  title,
  children,
}: {
  persona: Persona | null;
  title: string;
  children: ReactNode;
}) {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const nav = persona === 'margaret' ? SENDER_NAV : persona === 'david' ? APPROVER_NAV : [];
  const mode = persona === 'margaret' ? 'simple-mode' : 'standard-mode';
  const unread = persona ? unreadCount(state, persona) : 0;

  return (
    <div className={`min-h-screen ${mode}`}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50
                   focus:rounded focus:bg-white focus:p-3 focus:font-bold"
      >
        Skip to main content
      </a>
      <DemoBanner />

      <header className="border-b border-slate-300 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/" className="text-xl font-bold text-blue-900">
            {COPY.app.name}
          </Link>
          {persona ? (
            <>
              <span className="rounded-full border border-slate-400 px-3 py-1 text-sm">
                {persona === 'margaret'
                  ? `${COPY.people.sender.first} · ${COPY.roles.sender}`
                  : `${COPY.people.approver.first} · ${COPY.roles.approver}`}
              </span>
              <div className="ml-auto flex items-center gap-3">
                {persona === 'david' ? (
                  <NotificationBell count={unread} to="/d/notifications" />
                ) : null}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    dispatch({ type: 'LOCK', persona });
                    navigate('/');
                  }}
                >
                  Switch person
                </button>
              </div>
            </>
          ) : null}
        </div>
        {nav.length > 0 ? (
          <nav aria-label="Main" className="mx-auto max-w-5xl px-4 pb-2">
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {nav.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `inline-flex min-h-[44px] items-center border-b-4 px-1 font-semibold ${
                        isActive
                          ? 'border-blue-800 text-blue-900'
                          : 'border-transparent text-slate-700 hover:text-slate-900'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      <main id="main" className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="sr-only">{title}</h1>
        {state.lastError ? (
          <div className="mb-4">
            <ErrorState
              title={state.lastError}
              onDismiss={() => dispatch({ type: 'CLEAR_ERROR' })}
            />
          </div>
        ) : null}
        {children}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-10 text-sm text-slate-700">
        <p>
          {COPY.app.name} is a design prototype. No real bank is connected and no money moves.{' '}
          <Link to="/setup" className="link">
            Our agreement
          </Link>{' '}
          ·{' '}
          <Link to="/demo" className="link">
            Demo controls
          </Link>
        </p>
        <p className="mt-1">Demo clock: {new Intl.DateTimeFormat('en-GB', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'Europe/Amsterdam',
        }).format(now())}</p>
      </footer>
    </div>
  );
}
