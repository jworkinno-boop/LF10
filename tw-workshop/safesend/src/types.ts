// Domain types for SafeSend. Everything here is mock data — no real banking.

export type Persona = 'margaret' | 'david';

export type Role = 'sender' | 'approver';

export type Account = {
  id: string;
  ownerName: string;
  age: number;
  role: Role;
  iban?: string;
  balanceCents?: number;
  currency: 'EUR';
  countryCode: 'NL';
  phone: string;
  email: string;
};

export type CopResult = 'match' | 'close_match' | 'no_match' | 'unavailable';

export type PayeeStatus = 'trusted' | 'known' | 'new';

export type Payee = {
  id: string;
  displayName: string;
  iban: string;
  countryCode: string;
  status: PayeeStatus;
  isSaved: boolean;
  addedAt: string;
  lastPaidAt?: string;
  timesPaid: number;
  copResult?: CopResult;
  copNameOnAccount?: string;
  /** Added by the approver under the 24h rule; the sender may revoke at any time. */
  addedByApproverAt?: string;
};

export type ReasonCategory =
  | 'bill'
  | 'family'
  | 'shopping'
  | 'rent_care'
  | 'medical'
  | 'repairs'
  | 'investment'
  | 'fees_tax'
  | 'helping'
  | 'other';

export type SafetyAnswers = {
  contactedFirst: boolean | null;
  askedToKeepSecretOrHurry: boolean | null;
  verifiedOnKnownNumber: boolean | null;
};

export type RiskBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ScamPattern =
  | 'courier'
  | 'impersonation'
  | 'techSupport'
  | 'investment'
  | 'advanceFee'
  | 'romance'
  | 'invoiceRedirect';

export type RiskReason = {
  ruleId: string;
  points: number;
  plainLanguage: string;
  technical: string;
  /** true when a mitigator was calculated but ignored because of the mitigator gate. */
  gated?: boolean;
};

export type RiskAssessment = {
  score: number;
  band: RiskBand;
  requiresApproval: boolean;
  coolingOffMinutes: 0 | 30;
  reasons: RiskReason[];
  matchedScamPatterns: ScamPattern[];
  mitigatorsGated: boolean;
  mitigatorGateReasons: string[];
  circumstantialCapped: boolean;
  assessedAt: string;
  engineVersion: string;
};

export type TransferState =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED_HOLD'
  | 'SENT'
  | 'REJECTED'
  | 'INFO_REQUESTED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'BLOCKED';

export type Transfer = {
  id: string;
  createdAt: string;
  createdBy: Persona;
  payee: Payee;
  amountCents: number;
  currency: 'EUR';
  reasonCategory: ReasonCategory;
  reasonText: string;
  safetyAnswers: SafetyAnswers;
  risk: RiskAssessment;
  priorRisk?: RiskAssessment;
  priorReasonText?: string;
  supersedesTransferId?: string;
  state: TransferState;
  approval?: {
    decidedBy: Persona;
    decidedAt: string;
    decision: 'approved' | 'rejected';
    note?: string;
    rejectionReason?: string;
    spokeToSenderConfirmed?: boolean;
  };
  infoRequest?: { question: string; askedAt: string; answer?: string; answeredAt?: string };
  holdUntil?: string;
  sentAt?: string;
  expiresAt?: string;
};

/** A transfer being built in the 5-step wizard. */
export type TransferDraft = {
  step: 1 | 2 | 3 | 4 | 5;
  payeeId?: string;
  newPayee?: { displayName: string; iban: string; countryCode: string; save: boolean };
  amountCents: number | null;
  reasonCategory: ReasonCategory | null;
  reasonText: string;
  safetyAnswers: SafetyAnswers;
  supersedesTransferId?: string;
  priorReasonText?: string;
};

export type NotificationType =
  | 'approval_requested'
  | 'approved'
  | 'rejected'
  | 'info_requested'
  | 'info_answered'
  | 'hold_started'
  | 'sent'
  | 'expired'
  | 'blocked'
  | 'cancelled'
  | 'settings_change_pending'
  | 'settings_change_applied'
  | 'settings_change_cancelled'
  | 'trusted_payee_added'
  | 'trusted_payee_revoked'
  | 'contact_removal_pending';

export type NotificationEvent = {
  id: string;
  toPersona: Persona;
  type: NotificationType;
  transferId?: string;
  createdAt: string;
  readAt?: string;
  channels: {
    inApp: true;
    smsPreview: string;
    emailSubject: string;
    emailBody: string;
    pushBody: string;
  };
};

export type AuditEntry = {
  id: string;
  seq: number;
  transferId?: string;
  actor: Persona | 'system';
  action: string;
  fromState?: TransferState | string;
  toState?: TransferState | string;
  timestamp: string;
  note?: string;
};

export type Settings = {
  approvalThresholdCents: number;
  dailyLimitCents: number;
  alwaysApproveNewPayees: boolean;
  alwaysApproveCrossBorder: boolean;
  blockCriticalOutright: boolean;
  secondContactActive: boolean;
};

export type SettingsField =
  | keyof Settings
  | 'approverRemoved'
  | 'approverReplaced'
  | 'secondContactActivated'
  | 'trustedPayeeAdded';

export type PendingSettingsChange = {
  id: string;
  field: SettingsField;
  currentValue: unknown;
  newValue: unknown;
  requestedBy: Persona;
  requestedAt: string;
  effectiveAt: string;
  cancellableBy: Persona[];
  label: string;
};

/** A seeded 90-day outgoing payment (pre-dates the demo; not a Transfer). */
export type HistoryTxn = {
  id: string;
  payeeId: string;
  payeeName: string;
  amountCents: number;
  at: string;
  description: string;
};

export type TrustedContact = {
  id: string;
  persona: Persona | null;
  name: string;
  age: number;
  relationship: string;
  phone: string;
  email: string;
  active: boolean;
  since: string;
};

export type AppState = {
  schemaVersion: 1;
  revision: number;
  activePersona: Persona | null;
  unlocked: Persona[];
  accounts: Record<Persona, Account>;
  contacts: TrustedContact[];
  payees: Payee[];
  history: HistoryTxn[];
  transfers: Transfer[];
  notifications: NotificationEvent[];
  audit: AuditEntry[];
  settings: Settings;
  pendingChanges: PendingSettingsChange[];
  draft: TransferDraft | null;
  agreementMadeAt: string;
  seq: number;
  lastError: string | null;
  reseeded: boolean;
};
