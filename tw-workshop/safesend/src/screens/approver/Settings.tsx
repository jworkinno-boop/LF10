import { useState } from 'react';
import { AppShell } from '../../components/Layout';
import { Money } from '../../components/Money';
import { EmptyState } from '../../components/EmptyState';
import { COPY } from '../../copy';
import { CONFIG } from '../../config';
import { now } from '../../clock';
import { formatCountdown, formatMoney } from '../../format';
import { useApp } from '../../state/AppStateProvider';
import { trustedByApprover } from '../../state/selectors';
import type { Settings as SettingsType } from '../../types';

const TOGGLES: Array<{ field: keyof SettingsType; label: string; help: string }> = [
  {
    field: 'alwaysApproveNewPayees',
    label: 'Always check payments to someone new',
    help: 'Turning this off weakens protection, so it takes 24 hours.',
  },
  {
    field: 'alwaysApproveCrossBorder',
    label: 'Always check payments to another country',
    help: 'Turning this off weakens protection, so it takes 24 hours.',
  },
  {
    field: 'blockCriticalOutright',
    label: 'Block the riskiest payments outright',
    help: 'Turning this on is instant. Turning it off takes 24 hours.',
  },
];

export function Settings() {
  const { state, dispatch } = useApp();
  const [threshold, setThreshold] = useState(state.settings.approvalThresholdCents);
  const [dailyLimit, setDailyLimit] = useState(state.settings.dailyLimitCents);
  const trusted = trustedByApprover(state);

  const request = (field: keyof SettingsType, value: unknown) =>
    dispatch({ type: 'REQUEST_SETTINGS_CHANGE', field, value, actor: 'david', nowMs: now() });

  return (
    <AppShell persona="david" title="Settings">
      <div className="space-y-6">
        <section className="card space-y-4">
          <h2 className="text-xl">Amount that needs checking</h2>
          <p className="text-slate-700">
            Currently <Money cents={state.settings.approvalThresholdCents} />. Lowering it is
            instant. Raising it takes 24 hours, and {COPY.people.sender.first} can cancel it.
          </p>

          {/* Not drag-only: WCAG 2.2 SC 2.5.7 Dragging Movements. */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                setThreshold((v) => Math.max(CONFIG.thresholdRange.minCents, v - CONFIG.thresholdRange.stepCents))
              }
              aria-label={`Decrease by ${formatMoney(CONFIG.thresholdRange.stepCents)}`}
            >
              −
            </button>
            <input
              id="threshold-number"
              type="number"
              className="field max-w-[10rem]"
              min={CONFIG.thresholdRange.minCents / 100}
              max={CONFIG.thresholdRange.maxCents / 100}
              step={CONFIG.thresholdRange.stepCents / 100}
              value={threshold / 100}
              onChange={(event) => setThreshold(Math.round(Number(event.target.value) * 100))}
              aria-label="Amount that needs checking, in euros"
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                setThreshold((v) => Math.min(CONFIG.thresholdRange.maxCents, v + CONFIG.thresholdRange.stepCents))
              }
              aria-label={`Increase by ${formatMoney(CONFIG.thresholdRange.stepCents)}`}
            >
              +
            </button>
          </div>
          <input
            type="range"
            className="w-full"
            min={CONFIG.thresholdRange.minCents}
            max={CONFIG.thresholdRange.maxCents}
            step={CONFIG.thresholdRange.stepCents}
            value={threshold}
            onChange={(event) => setThreshold(Number(event.target.value))}
            aria-label="Amount that needs checking (slider)"
          />
          <button
            type="button"
            className="btn-primary"
            onClick={() => request('approvalThresholdCents', threshold)}
            disabled={threshold === state.settings.approvalThresholdCents}
          >
            {threshold > state.settings.approvalThresholdCents
              ? 'Request this change (24 hours)'
              : 'Apply now'}
          </button>
        </section>

        <section className="card space-y-4">
          <h2 className="text-xl">Daily amount</h2>
          <p className="text-slate-700">
            Currently <Money cents={state.settings.dailyLimitCents} />. Going over this forces a
            check — it never blocks a payment outright.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                setDailyLimit((v) =>
                  Math.max(CONFIG.dailyLimitRange.minCents, v - CONFIG.dailyLimitRange.stepCents),
                )
              }
              aria-label={`Decrease by ${formatMoney(CONFIG.dailyLimitRange.stepCents)}`}
            >
              −
            </button>
            <input
              type="number"
              className="field max-w-[10rem]"
              min={CONFIG.dailyLimitRange.minCents / 100}
              max={CONFIG.dailyLimitRange.maxCents / 100}
              step={CONFIG.dailyLimitRange.stepCents / 100}
              value={dailyLimit / 100}
              onChange={(event) => setDailyLimit(Math.round(Number(event.target.value) * 100))}
              aria-label="Daily amount, in euros"
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                setDailyLimit((v) =>
                  Math.min(CONFIG.dailyLimitRange.maxCents, v + CONFIG.dailyLimitRange.stepCents),
                )
              }
              aria-label={`Increase by ${formatMoney(CONFIG.dailyLimitRange.stepCents)}`}
            >
              +
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => request('dailyLimitCents', dailyLimit)}
              disabled={dailyLimit === state.settings.dailyLimitCents}
            >
              {dailyLimit > state.settings.dailyLimitCents
                ? 'Request this change (24 hours)'
                : 'Apply now'}
            </button>
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="text-xl">Checks</h2>
          {TOGGLES.map((toggle) => (
            <div key={toggle.field} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{toggle.label}</p>
                <p className="text-sm text-slate-700">{toggle.help}</p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                aria-pressed={Boolean(state.settings[toggle.field])}
                onClick={() => request(toggle.field, !state.settings[toggle.field])}
              >
                {state.settings[toggle.field] ? 'On' : 'Off'}
              </button>
            </div>
          ))}
        </section>

        <section className="card">
          <h2 className="text-xl">Trusted payees</h2>
          <p className="mt-1 text-slate-700">
            Adding one takes 24 hours, {COPY.people.sender.first} is told, and she can undo it at any
            time — before or after.
          </p>
          {trusted.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="No payees have been added to the trusted list." />
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {trusted.map((payee) => (
                <li key={payee.id}>{payee.displayName}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="text-xl">Changes waiting to take effect</h2>
          {state.pendingChanges.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="Nothing is waiting." />
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {state.pendingChanges.map((change) => (
                <li key={change.id} className="flex flex-wrap items-center gap-3">
                  <span>
                    {change.label} — in {formatCountdown(change.effectiveAt)}
                  </span>
                  {change.cancellableBy.includes('david') ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() =>
                        dispatch({
                          type: 'CANCEL_PENDING_CHANGE',
                          changeId: change.id,
                          actor: 'david',
                          nowMs: now(),
                        })
                      }
                    >
                      Cancel this change
                    </button>
                  ) : (
                    <span className="text-sm text-slate-700">
                      Only {COPY.people.sender.first} can cancel this.
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
