// Mock notification previews. The SMS NEVER contains a link and never asks for
// a code — teaching people to tap links in bank texts is how smishing works.

import { COPY } from '../copy';
import { formatMoney } from '../format';
import { id } from '../ids';
import type { NotificationEvent, NotificationType, Persona, Transfer } from '../types';

const SENDER = COPY.people.sender.first;
const APPROVER = COPY.people.approver.first;

const SMS_FOOTER = 'Open your SafeSend app to review. We never send links or ask for codes.';

type BuildArgs = {
  type: NotificationType;
  toPersona: Persona;
  createdAt: string;
  transfer?: Transfer;
  detail?: string;
};

function describe(args: BuildArgs): {
  sms: string;
  subject: string;
  body: string;
  push: string;
} {
  const { type, transfer, detail } = args;
  const amount = transfer ? formatMoney(transfer.amountCents) : '';
  const payeeName = transfer?.payee.displayName ?? '';
  const band = transfer?.risk.band ?? 'LOW';
  const ref = transfer ? transfer.id : '';

  switch (type) {
    case 'approval_requested':
      return {
        sms: `SafeSend: ${SENDER} has asked to send ${amount} to ${transfer?.payee.timesPaid === 0 ? 'a new payee' : payeeName}. Flagged ${band}. ${SMS_FOOTER}`,
        subject: `${SENDER} needs your approval for ${amount}`,
        body: `${SENDER} has asked to send ${amount} to ${payeeName}.\n\nReference: ${ref}\nRisk band: ${band}\nReason given: "${transfer?.reasonText ?? ''}"\n\nOpen SafeSend to see the full safety check and decide. We will never ask you for a code or send you a link.`,
        push: `${SENDER}: ${amount} to ${payeeName} — ${band}. Tap to review.`,
      };
    case 'approved':
      return {
        sms: `SafeSend: ${APPROVER} approved your payment of ${amount}. ${SMS_FOOTER}`,
        subject: `${APPROVER} approved your payment of ${amount}`,
        body: `${APPROVER} approved your payment of ${amount} to ${payeeName}.\n\nReference: ${ref}`,
        push: `${APPROVER} approved ${amount} to ${payeeName}.`,
      };
    case 'rejected':
      return {
        sms: `SafeSend: ${APPROVER} has stopped a payment of ${amount}. ${SMS_FOOTER}`,
        subject: `${APPROVER} stopped your payment of ${amount}`,
        body: `${APPROVER} stopped your payment of ${amount} to ${payeeName}.\n\nReason: ${detail ?? 'no reason given'}\n\nNothing has left your account.`,
        push: `${APPROVER} stopped ${amount} to ${payeeName}.`,
      };
    case 'info_requested':
      return {
        sms: `SafeSend: ${APPROVER} has a question about your payment of ${amount}. ${SMS_FOOTER}`,
        subject: `${APPROVER} has a question about your payment`,
        body: `${APPROVER} asked: "${detail ?? ''}"\n\nOpen SafeSend to reply. Your payment of ${amount} is on hold until you do.`,
        push: `${APPROVER} asked a question about ${amount}.`,
      };
    case 'info_answered':
      return {
        sms: `SafeSend: ${SENDER} has replied to your question. ${SMS_FOOTER}`,
        subject: `${SENDER} replied about ${amount}`,
        body: `${SENDER} replied: "${detail ?? ''}"\n\nThe payment has been re-checked and is waiting for your decision.`,
        push: `${SENDER} replied about ${amount}.`,
      };
    case 'hold_started':
      return {
        sms: `SafeSend: a payment of ${amount} is approved and will send after a short wait. ${SMS_FOOTER}`,
        subject: `${amount} approved with a 30-minute wait`,
        body: `The payment of ${amount} to ${payeeName} was approved. Because it was flagged as high risk, it will send after a 30-minute wait. Either of you can cancel it during that time.`,
        push: `${amount} approved — 30-minute wait started.`,
      };
    case 'sent':
      return {
        sms: `SafeSend: a payment of ${amount} has been sent. ${SMS_FOOTER}`,
        subject: `${amount} sent to ${payeeName}`,
        body: `The payment of ${amount} to ${payeeName} has been sent.\n\nReference: ${ref}`,
        push: `${amount} sent to ${payeeName}.`,
      };
    case 'expired':
      return {
        sms: `SafeSend: a payment of ${amount} expired without a decision. ${SMS_FOOTER}`,
        subject: `${amount} expired without a decision`,
        body: `Nobody decided on the payment of ${amount} to ${payeeName} within 24 hours, so it has expired. Nothing left the account. ${SENDER} can send it again in one tap.`,
        push: `${amount} expired without a decision.`,
      };
    case 'blocked':
      return {
        sms: `SafeSend: a payment of ${amount} was not sent. ${SMS_FOOTER}`,
        subject: `${amount} was not sent`,
        body: `A payment of ${amount} to ${payeeName} was not sent, because it matched a known scam pattern and the "block outright" setting is on. Nothing left the account.`,
        push: `${amount} was not sent.`,
      };
    case 'cancelled':
      return {
        sms: `SafeSend: a payment of ${amount} was cancelled. ${SMS_FOOTER}`,
        subject: `${amount} cancelled`,
        body: `The payment of ${amount} to ${payeeName} was cancelled. Nothing left the account.`,
        push: `${amount} cancelled.`,
      };
    case 'settings_change_pending':
      return {
        sms: `SafeSend: a change to your safety settings has been requested. ${SMS_FOOTER}`,
        subject: 'A change to your safety settings was requested',
        body: `${detail ?? 'A setting change was requested.'}\n\nIt takes effect in 24 hours. Open SafeSend if you want to cancel it.`,
        push: detail ?? 'A setting change was requested.',
      };
    case 'settings_change_applied':
      return {
        sms: `SafeSend: a change to your safety settings has taken effect. ${SMS_FOOTER}`,
        subject: 'A change to your safety settings has taken effect',
        body: `${detail ?? 'A setting change took effect.'}`,
        push: detail ?? 'A setting change took effect.',
      };
    case 'settings_change_cancelled':
      return {
        sms: `SafeSend: a requested settings change was cancelled. ${SMS_FOOTER}`,
        subject: 'A requested settings change was cancelled',
        body: `${detail ?? 'A setting change was cancelled.'}`,
        push: detail ?? 'A setting change was cancelled.',
      };
    case 'trusted_payee_added':
      return {
        sms: `SafeSend: a payee was added to your trusted list. ${SMS_FOOTER}`,
        subject: 'A payee was added to your trusted list',
        body: `${detail ?? ''}\n\nPayments to them below your checking amount will no longer be checked. You can undo this at any time in "Who helps me".`,
        push: detail ?? 'A trusted payee was added.',
      };
    case 'trusted_payee_revoked':
      return {
        sms: `SafeSend: a trusted payee was removed. ${SMS_FOOTER}`,
        subject: 'A trusted payee was removed',
        body: `${detail ?? ''}`,
        push: detail ?? 'A trusted payee was removed.',
      };
    case 'contact_removal_pending':
      return {
        sms: `SafeSend: a change to who helps with payments has been requested. ${SMS_FOOTER}`,
        subject: 'A change to who helps with payments',
        body: `${detail ?? ''}\n\nThis takes effect in 24 hours. Only ${SENDER} can cancel it.`,
        push: detail ?? 'A change to who helps was requested.',
      };
  }
}

export function buildNotification(args: BuildArgs): NotificationEvent {
  const { sms, subject, body, push } = describe(args);
  return {
    id: id('note'),
    toPersona: args.toPersona,
    type: args.type,
    transferId: args.transfer?.id,
    createdAt: args.createdAt,
    channels: {
      inApp: true,
      smsPreview: sms,
      emailSubject: subject,
      emailBody: body,
      pushBody: push,
    },
  };
}

export function unreadFor(
  notifications: NotificationEvent[],
  persona: Persona,
): NotificationEvent[] {
  return notifications.filter((n) => n.toPersona === persona && !n.readAt);
}
