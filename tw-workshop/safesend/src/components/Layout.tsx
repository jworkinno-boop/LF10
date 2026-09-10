import { Link, NavLink, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { COPY } from '../copy';
import { useApp } from '../state/AppStateProvider';
import { activeContact, unreadCount } from '../state/selectors';
import { DemoBanner } from './DemoBanner';
import { NotificationBell } from './NotificationBell';
import { ErrorState } from './ErrorState';
import { BrandBanner } from './Brand';
import { ThemeToggle } from './ThemeToggle';
import { now } from '../clock';
import type { Persona } from '../types';

// Three destinations, and only three. "Is this a scam?" is now the content of
// the result screen, which is where the question actually gets asked, and
// "What has happened" folds into each payment's own timeline; both were nav
// items because there was nowhere else to put them. Icons are inline text —
// this build carries no icon library.
const SENDER_NAV = [
  { to: '/m', label: 'Home', icon: '\u2302', end: true },
  { to: '/m/activity', label: 'My payments', icon: '\u2261' },
  { to: '/m/helpers', label: COPY.sender.whoHelpsMe, icon: '\u263A' },
];

const APPROVER_NAV = [
  { to: '/d', label: 'Approvals', end: true },
  { to: '/d/notifications', label: 'Messages' },
  { to: '/d/settings', label: 'Settings' },
  { to: '/audit', label: COPY.shared.transactionHistory },
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
  // Stated only when it is true. There is no grey or red counterpart: an
  // absence of protection is said in words on /m/helpers, not implied here.
  const protectionOn = Boolean(activeContact(state));

  return (
    <div className={`min-h-screen ${mode}`}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50
                   focus:rounded focus:bg-surface focus:p-3 focus:font-bold"
      >
        Skip to main content
      </a>
      <DemoBanner />

      <header className="bg-surface shadow-card">
        <div className="mx-auto flex w-full max-w-[96rem] flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          {/* The banner already reads as the product name, so it is not
              repeated as text. Its alt is what names this link. */}
          <Link to="/" className="inline-flex shrink-0 items-center rounded-ctl py-1">
            <BrandBanner className="h-8 w-auto sm:h-9" />
          </Link>
          {protectionOn ? (
            <span className="pill-ok">
              <span className="h-2 w-2 shrink-0 rounded-full bg-ok-dot" aria-hidden="true" />
              Protection on
            </span>
          ) : null}
          {persona ? (
            <span className="text-base font-medium text-ink-2">
              {persona === 'margaret'
                ? `${COPY.people.sender.first} · ${COPY.roles.sender}`
                : `${COPY.people.approver.first} · ${COPY.roles.approver}`}
            </span>
          ) : null}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
            <ThemeToggle />
            {persona === 'david' ? (
              <NotificationBell count={unread} to="/d/notifications" />
            ) : null}
          </div>
        </div>
        {persona === 'margaret' ? (
          /* Tiles, on every screen including mid-wizard: leaving a payment is
             always one tap, and the wizard's own Stop button confirms before it
             discards anything. One column below 480px rather than three tiles
             squeezed under 64px. */
          <nav aria-label="Main" className="mx-auto w-full max-w-[96rem] px-4 pb-3 sm:px-6 lg:px-8">
            <ul className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
              {SENDER_NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => (isActive ? 'nav-tile-on' : 'nav-tile-off')}
                  >
                    <span aria-hidden="true" className="text-2xl leading-none">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        ) : nav.length > 0 ? (
          /* David's side keeps its four text links and its 16px density until
             that redesign is settled (handoff §9). */
          <nav aria-label="Main" className="mx-auto w-full max-w-[96rem] px-4 pb-2 sm:px-6 lg:px-8">
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {nav.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `inline-flex min-h-[52px] items-center border-b-4 px-1 font-semibold ${
                        isActive
                          ? 'border-ok text-ink'
                          : 'border-transparent text-ink-2 hover:text-ink'
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
        <div className="brand-rule" aria-hidden="true" />
      </header>

      <main id="main" className="mx-auto w-full max-w-[96rem] px-4 py-6 sm:px-6 lg:px-8">
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

      <footer className="mx-auto w-full max-w-[96rem] px-4 pb-10 text-sm text-ink-3 sm:px-6 lg:px-8">
        {/* The demo's own controls live down here, out of the three
            destinations the header is now reserved for. */}
        {persona ? (
          <p className="mb-3">
            <button
              type="button"
              className="link"
              onClick={() => {
                dispatch({ type: 'LOCK', persona });
                navigate('/');
              }}
            >
              Switch person
            </button>{' '}
            ·{' '}
            <Link to="/audit" className="link">
              {COPY.shared.transactionHistory}
            </Link>
          </p>
        ) : null}
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
