import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../../components/Layout';
import { Money } from '../../components/Money';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { COPY } from '../../copy';
import { CONFIG } from '../../config';
import { now } from '../../clock';
import { formatCountdown, formatDate } from '../../format';
import { useApp } from '../../state/AppStateProvider';
import { trustedByApprover } from '../../state/selectors';

export function Helpers() {
  const { state, dispatch } = useApp();
  const [confirming, setConfirming] = useState<'remove' | 'replace' | 'activate_second' | null>(null);
  const active = state.contacts.filter((c) => c.active);
  const second = state.contacts.find((c) => c.id === 'contact_jean');
  const trusted = trustedByApprover(state);
  const pendingTrusted = state.pendingChanges.filter((c) => c.field === 'trustedPayeeAdded');

  return (
    <AppShell persona="margaret" title={COPY.sender.whoHelpsMe}>
      <div className="mx-auto max-w-2xl space-y-6">
        <h2 className="text-2xl">{COPY.sender.whoHelpsMe}</h2>

        {active.length === 0 ? (
          <div className="card">
            <p className="text-lg font-semibold">Nobody is checking your payments at the moment.</p>
            <p className="mt-2">
              You can ask someone to help again from the demo controls, or activate{' '}
              {COPY.people.secondContact.first}.
            </p>
          </div>
        ) : (
          active.map((contact) => (
            <section key={contact.id} className="card">
              <h3 className="text-xl font-bold">{contact.name}</h3>
              <p className="text-slate-700">
                {contact.relationship} · helping since {formatDate(contact.since)}
              </p>
              <p className="mt-2">
                Phone {contact.phone} · {contact.email}
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-300 p-3">
                  <p className="font-semibold">What {contact.name.split(' ')[0]} can do</p>
                  <ul className="mt-2 space-y-1">
                    {COPY.agreement.approverCan.map((line) => (
                      <li key={line}>• {line}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-300 p-3">
                  <p className="font-semibold">What he cannot do</p>
                  <ul className="mt-2 space-y-1">
                    {COPY.agreement.approverCannot.map((line) => (
                      <li key={line}>• {line}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          ))
        )}

        <section className="card">
          <h3 className="text-xl font-bold">Payments that get checked</h3>
          <p className="mt-2">
            Anything above <Money cents={state.settings.approvalThresholdCents} /> is checked, and so
            is anything unusual. More than{' '}
            <Money cents={state.settings.dailyLimitCents} /> in one day is checked too.
          </p>
          <p className="mt-2 text-slate-700">
            You can always lower these amounts yourself, straight away. Raising them takes 24 hours
            and you are always told.
          </p>
          <button
            type="button"
            className="btn-secondary mt-3"
            onClick={() =>
              dispatch({
                type: 'REQUEST_SETTINGS_CHANGE',
                field: 'approvalThresholdCents',
                value: Math.max(
                  CONFIG.thresholdRange.minCents,
                  state.settings.approvalThresholdCents - CONFIG.thresholdRange.stepCents,
                ),
                actor: 'margaret',
                nowMs: now(),
              })
            }
          >
            Check more of my payments (lower it by{' '}
            <Money cents={CONFIG.thresholdRange.stepCents} />)
          </button>
        </section>

        {trusted.length > 0 || pendingTrusted.length > 0 ? (
          <section className="card">
            <h3 className="text-xl font-bold">People {COPY.people.approver.first} marked as trusted</h3>
            <p className="mt-2 text-slate-700">
              Payments to these people below your checking amount are not checked. You can undo this
              at any time.
            </p>
            <ul className="mt-3 space-y-3">
              {pendingTrusted.map((change) => (
                <li key={change.id} className="flex flex-wrap items-center gap-3">
                  <span>{change.label} — takes effect in {formatCountdown(change.effectiveAt)}</span>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      dispatch({
                        type: 'CANCEL_PENDING_CHANGE',
                        changeId: change.id,
                        actor: 'margaret',
                        nowMs: now(),
                      })
                    }
                  >
                    Undo this
                  </button>
                </li>
              ))}
              {trusted.map((payee) => (
                <li key={payee.id} className="flex flex-wrap items-center gap-3">
                  <span>{payee.displayName}</span>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      dispatch({
                        type: 'REVOKE_TRUSTED_PAYEE',
                        payeeId: payee.id,
                        actor: 'margaret',
                        nowMs: now(),
                      })
                    }
                  >
                    Remove from trusted
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {state.pendingChanges.filter((c) => c.field !== 'trustedPayeeAdded').length > 0 ? (
          <section className="card">
            <h3 className="text-xl font-bold">Changes waiting to happen</h3>
            <ul className="mt-3 space-y-3">
              {state.pendingChanges
                .filter((c) => c.field !== 'trustedPayeeAdded')
                .map((change) => (
                  <li key={change.id} className="flex flex-wrap items-center gap-3">
                    <span>
                      {change.label} — in {formatCountdown(change.effectiveAt)}
                    </span>
                    {change.cancellableBy.includes('margaret') ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() =>
                          dispatch({
                            type: 'CANCEL_PENDING_CHANGE',
                            changeId: change.id,
                            actor: 'margaret',
                            nowMs: now(),
                          })
                        }
                      >
                        Cancel this change
                      </button>
                    ) : null}
                  </li>
                ))}
            </ul>
          </section>
        ) : null}

        <section className="card space-y-4">
          <h3 className="text-xl font-bold">Changing the arrangement</h3>
          <p>
            These are your decisions. {COPY.people.approver.first} is told, but he cannot stop them.
            Each takes 24 hours, and only you can cancel it in that time.
          </p>
          <div className="flex flex-col gap-4">
            <button type="button" className="btn-secondary" onClick={() => setConfirming('replace')}>
              Change who helps me
            </button>
            {second && !second.active ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirming('activate_second')}
              >
                Also ask {second.name} to help
              </button>
            ) : null}
            <button type="button" className="btn-danger" onClick={() => setConfirming('remove')}>
              Stop asking {COPY.people.approver.first}
            </button>
          </div>
          <Link to="/setup" className="link">
            Read our agreement
          </Link>
        </section>

        <ConfirmDialog
          open={confirming !== null}
          title={
            confirming === 'remove'
              ? `Stop asking ${COPY.people.approver.first}?`
              : confirming === 'replace'
                ? 'Change who helps you?'
                : `Also ask ${COPY.people.secondContact.first}?`
          }
          confirmLabel="Yes, start this change"
          destructive={confirming === 'remove'}
          onCancel={() => setConfirming(null)}
          onConfirm={() => {
            dispatch({
              type: 'START_CONTACT_CHANGE',
              mode: confirming!,
              actor: 'margaret',
              nowMs: now(),
              replacementContactId: confirming === 'replace' ? 'contact_jean' : undefined,
            });
            setConfirming(null);
          }}
        >
          <p>
            This takes effect in 24 hours. Both of you are told. Only you can cancel it in that
            time — {COPY.people.approver.first} cannot.
          </p>
        </ConfirmDialog>
      </div>
    </AppShell>
  );
}
