// Every user-facing string lives here so reading level and tone can be reviewed
// in one place — and so no persona name is baked into a component.

import type { ReasonCategory, RiskBand, ScamPattern } from './types';

export const COPY = {
  app: {
    name: 'SafeSend',
    tagline: 'A second pair of eyes before your money leaves',
    demoBanner: 'DEMO ONLY — no real money moves and no real bank is connected.',
    riskDisclaimer:
      'SafeSend is a demo. It can be wrong — always check with someone you trust.',
  },

  people: {
    sender: { first: 'Margaret', full: 'Margaret Whitfield' },
    approver: { first: 'David', full: 'David Whitfield' },
    secondContact: { first: 'Jean', full: 'Jean Okafor' },
  },

  roles: {
    sender: 'Account holder',
    approver: 'Trusted contact',
  },

  landing: {
    heading: 'SafeSend',
    intro:
      'A protective check between an account holder and money leaving their account. Choose who you want to be.',
    openBoth: 'Open both side by side',
    howItWorks: 'How this demo works',
    howItWorksBody: [
      'Margaret can pay anyone she likes. Nothing is blocked because of who she is.',
      'Every payment needs a reason in her own words.',
      'Larger or unusual payments are passed to David to check first.',
      'David can approve, reject, or ask a question. He can never move money himself.',
      'Margaret can stop the arrangement at any time. David cannot stop her leaving.',
    ],
    pinPrompt: 'Enter the 4-digit demo PIN',
    pinHelp: 'This is a demo PIN shown on the card. You can paste it.',
    pinWrong: 'That PIN does not match. Try again.',
  },

  sender: {
    homeGreeting: 'Hello Margaret',
    balanceLabel: 'Money in your account',
    sendMoney: 'Send money',
    recentPayments: 'Your last payments',
    noRecentPayments: 'You have not made any payments yet.',
    pendingHeading: 'Waiting for David',
    expiredHeading: 'David did not answer in time',
    questionHeading: 'David has a question for you',
    seeAll: 'See all payments',
    whoHelpsMe: 'Who helps me',
    isThisAScam: 'Is this a scam?',
    reportConcern: 'Report a concern',
    cancelPayment: 'Cancel this payment',
  },

  wizard: {
    stepOf: (n: number, total: number) => `Step ${n} of ${total}`,
    back: 'Back',
    next: 'Continue',
    steps: {
      1: {
        title: 'Who are you paying?',
        newPayee: 'Someone new',
        newPayeeNote: 'New payees get an extra safety check. This is normal.',
        nameLabel: 'Their name',
        ibanLabel: 'Their account number (IBAN)',
        countryLabel: 'Country of the account',
        saveLabel: 'Save them in my address book',
      },
      2: {
        title: 'How much?',
        amountLabel: 'Amount in euros',
        keypadLabel: 'Number keypad',
        remaining: 'Left in your account after this payment',
        tooMuch: 'That is more than you have in your account.',
        tooSmall: 'Please enter an amount above zero.',
      },
      3: {
        title: 'Why are you sending this money?',
        categoryLabel: 'Pick the closest one',
        textLabel: 'Tell us in your own words',
        textHelp: 'Please write at least 10 characters.',
        vagueHint: 'A little more detail helps David understand the payment.',
      },
      4: {
        title: 'Safety check',
        intro: 'Three quick questions. Your answers go to David exactly as you give them.',
        q1: 'Did someone contact you first about this payment?',
        q2: 'Has anyone asked you to keep this payment secret, or to hurry?',
        q3: 'Have you spoken to this person on a number you already had?',
        yes: 'Yes',
        no: 'No',
      },
      5: {
        title: 'Check and confirm',
        sendNow: 'Send now',
        askApprover: 'Ask David',
        askApproverHold: 'Ask David, then a 30-minute wait',
        blocked: 'This payment cannot be sent from here',
      },
    },
  },

  risk: {
    bandLabel: {
      LOW: 'Looks normal',
      MEDIUM: 'Worth a second look',
      HIGH: 'This looks risky',
      CRITICAL: 'This looks like a scam',
    } as Record<RiskBand, string>,
    bandIcon: { LOW: '✓', MEDIUM: '!', HIGH: '!!', CRITICAL: '⚠' } as Record<RiskBand, string>,
    senderHeading: 'What we noticed',
    approverHeading: 'Risk report',
    noReasons: 'Nothing unusual stood out.',
    mitigatorsGated:
      'Familiarity with this payee was not allowed to lower this score, because of the signals listed above.',
    circumstantialCapped:
      'Circumstantial signals are capped so that ordinary large payments never reach a scam warning on their own.',
  },

  approver: {
    dashboard: 'Approvals',
    pending: 'Waiting for your decision',
    noPending: 'Nothing is waiting for you.',
    approve: 'Approve',
    reject: 'Reject',
    askQuestion: 'Ask a question',
    addTrusted: 'Add to trusted payees',
    spokeConfirm: 'I have spoken to Margaret directly about this payment.',
    rejectionReasons: {
      scam: 'I think this is a scam',
      wrong_details: 'Wrong details',
      talk_first: "Let's talk first",
      other: 'Other',
    },
    talkHeading: 'How to talk about this',
    talkIntro:
      'Do not lead with an accusation — it makes people dig in. Ask open questions and let Margaret reach her own conclusion.',
    talkQuestions: [
      'Tell me how this came about — who got in touch first?',
      'What did they say would happen if you didn’t pay today?',
      'Shall we ring the number on your bank card together and check?',
    ],
    smsNoLinkNote:
      'Our messages never contain a link and never ask for a code. That is how you can tell a real SafeSend message from a fake one.',
    callNow: 'Call Margaret now',
  },

  categories: {
    bill: 'Bill or utility',
    family: 'Family or gift',
    shopping: 'Shopping / goods',
    rent_care: 'Rent or care costs',
    medical: 'Medical',
    repairs: 'Repairs or tradesperson',
    investment: 'Investment or savings',
    fees_tax: 'Fees, tax or customs',
    helping: 'Helping someone out',
    other: 'Other',
  } as Record<ReasonCategory, string>,

  states: {
    DRAFT: 'Not finished',
    PENDING_APPROVAL: 'Waiting for David',
    APPROVED_HOLD: 'Approved — short wait before it goes',
    SENT: 'Sent',
    REJECTED: 'Stopped by David',
    INFO_REQUESTED: 'David has a question',
    EXPIRED: 'No answer in time',
    CANCELLED: 'Cancelled',
    BLOCKED: 'Not sent',
  },

  scamPatterns: {
    courier: {
      title: 'The "safe account" scam',
      howItStarts:
        'Someone rings and says they are from your bank, the police or a fraud team.',
      whatTheySay:
        'They say your money is at risk and must be moved to a "safe account" today, and that you must not tell anyone — not even bank staff.',
      whatToDo:
        'Hang up. Wait five minutes, then ring the number printed on your bank card. Real banks and the police never ask you to move money to keep it safe.',
    },
    impersonation: {
      title: 'Someone pretending to be an official',
      howItStarts: 'A call, text or email that appears to come from a bank, the tax office or the police.',
      whatTheySay: 'That you owe money, that your account is compromised, or that you will be arrested.',
      whatToDo: 'Never use a number or link they give you. Look the organisation up yourself and ring them.',
    },
    techSupport: {
      title: 'The computer support scam',
      howItStarts: 'A warning appears on your screen, or someone rings about a "problem with your computer".',
      whatTheySay: 'They ask to connect to your computer to fix it, then say you are owed a refund.',
      whatToDo: 'Never let a stranger connect to your computer. No real company will ask for a payment to give you a refund.',
    },
    investment: {
      title: 'The too-good investment',
      howItStarts: 'An advert, a message, or a friendly stranger with a "special opportunity".',
      whatTheySay: 'Guaranteed returns, no risk, or a chance to double your money. Often crypto.',
      whatToDo: 'Guaranteed returns do not exist. Take a week to think, and talk to someone you trust first.',
    },
    advanceFee: {
      title: 'Pay a fee to get your prize',
      howItStarts: 'You are told you have won something, inherited something, or have a parcel waiting.',
      whatTheySay: 'A customs fee, release fee or tax must be paid before you can have it.',
      whatToDo: 'You never have to pay to receive money you have won. If you did not enter, you did not win.',
    },
    romance: {
      title: 'The online friend who needs money',
      howItStarts: 'You meet online. They are warm, attentive, and always have a reason not to meet.',
      whatTheySay: 'They are stuck abroad, in hospital, or in trouble, and need money quickly.',
      whatToDo: 'Never send money to someone you have not met in person. Talk to a friend or family member first.',
    },
    invoiceRedirect: {
      title: 'The changed bank details',
      howItStarts: 'An email or letter that looks like it is from a company you already pay.',
      whatTheySay: 'Their bank details have changed, so please pay into the new account.',
      whatToDo: 'Ring the company on a number you already had — never the one in the message — and check.',
    },
  } as Record<ScamPattern, { title: string; howItStarts: string; whatTheySay: string; whatToDo: string }>,

  aftermath: {
    heading: 'What to do now',
    points: [
      'Do not reply to them again, and do not answer if they ring back.',
      'Expect another call. They may claim to be from your bank, the police, or SafeSend itself.',
      'Your bank will never ask you to move money to keep it safe, and never asks for your PIN or passcode.',
      'Change your online banking password, using the bank’s own app or website.',
      'Tell someone you trust what happened. None of this is your fault.',
    ],
  },

  agreement: {
    heading: 'Our agreement',
    intro:
      'This is what Margaret and David agreed. Both of them can read this page at any time.',
    senderCan: [
      'Pay anyone she chooses.',
      'See everything David sees, including every action he takes.',
      'Lower the amount that needs checking, at any time, straight away.',
      'Change who helps her, or stop the arrangement — David cannot block this.',
      'Cancel a payment while it is waiting or on hold.',
    ],
    senderCannot: [
      'Raise the amount that needs checking on her own.',
      'Skip the safety questions or the approval step.',
    ],
    approverCan: [
      'See payments that need checking, with the reason and safety answers.',
      'Approve, reject, or ask a question.',
      'Suggest a higher checking amount — it takes 24 hours to take effect.',
      'See a 90-day summary of spending patterns.',
    ],
    approverCannot: [
      'Move money, or start a payment.',
      'See day-to-day spending beyond the 90-day summary.',
      'Stop Margaret removing him.',
      'Add a trusted payee without Margaret being told — and she can undo it at once.',
    ],
  },

  report: {
    heading: 'Report a concern',
    intro:
      'If you think someone has tried to trick you, or money has already gone, act quickly. Nothing here is a real reporting service.',
    steps: [
      'Ring your bank on the number printed on your bank card. Do not use a number from a message.',
      'Tell them what happened and when. Ask them to try to recall the payment.',
      'Report it to your national fraud reporting line or the police.',
      'Tell someone you trust. Scammers rely on people feeling too embarrassed to speak up.',
    ],
    placeholderNote:
      'This demo does not contain a real fraud hotline number. A production build must use the correct national number for its jurisdiction.',
  },

  errors: {
    illegalTransition: 'That action is not allowed at this point.',
    notYourTransfer: 'Only the person who started this payment can do that.',
    approverOnly: 'Only the trusted contact can do that.',
    senderOnly: 'Only the account holder can do that.',
    corruptState:
      'We could not read your saved demo data, so we have started a fresh demo. Nothing real was affected.',
  },

  empty: {
    noTransfers: 'No payments yet.',
    noNotifications: 'No messages yet.',
    noAudit: 'Nothing has happened yet.',
    noPayees: 'Your address book is empty.',
  },
} as const;
