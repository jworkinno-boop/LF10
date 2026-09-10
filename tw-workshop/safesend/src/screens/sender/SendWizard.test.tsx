import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, within } from '@testing-library/react';
import { renderAt, seedStorage } from '../../test/renderApp';

// The wizard is three steps: who · how much and why · safety questions
// (handoff §1.2). A trusted payee is not asked the safety questions, so that
// path is two. The step position lives in the eyebrow above the progress bar;
// each step's own <h2> is the plain question, which is what focus moves to.

function unlocked() {
  seedStorage((state) => ({
    ...state,
    unlocked: ['margaret', 'david'],
    activePersona: 'margaret',
  }));
}

type User = ReturnType<typeof userEvent.setup>;

/** Northgate Energy is trusted: two steps, no safety questions. */
async function trustedPayee(user: User) {
  await user.click(screen.getByRole('radio', { name: /Northgate Energy/ }));
  await user.click(screen.getByRole('button', { name: 'Continue' }));
}

async function amountAndReason(user: User, amount: string, reason: string) {
  await user.type(screen.getByLabelText('Amount in euros'), amount);
  await user.type(screen.getByLabelText('Why are you sending this money?'), reason);
  await user.click(screen.getByRole('button', { name: 'Continue' }));
}

describe('the send wizard', () => {
  it('names the step, and moves focus to the step heading', async () => {
    unlocked();
    const user = userEvent.setup();
    renderAt('/m/send');

    // Three until she picks someone: an unknown payee is asked the safety
    // questions, so the count only drops once a trusted one is chosen.
    expect(screen.getByText(/Step 1 of 3/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Who are you paying?' })).toBeInTheDocument();

    await trustedPayee(user);

    expect(screen.getByText(/Step 2 of 2/)).toBeInTheDocument();
    const heading = screen.getByRole('heading', { name: 'How much, and why?' });
    expect(heading).toBeInTheDocument();
    expect(document.activeElement).toBe(heading);
  });

  it('offers a typable amount field as well as the keypad', async () => {
    unlocked();
    const user = userEvent.setup();
    renderAt('/m/send');
    await trustedPayee(user);

    const amount = screen.getByLabelText('Amount in euros');
    await user.type(amount, '62.40');
    expect(screen.getByText(/sixty-two euros and forty cents/)).toBeInTheDocument();
    // Keypad-only would be a keyboard trap; typing-only loses touch.
    expect(screen.getByRole('group', { name: 'Number keypad' })).toBeInTheDocument();
  });

  it('asks for the reason in her own words, and offers no categories to pick', async () => {
    unlocked();
    const user = userEvent.setup();
    renderAt('/m/send');
    await trustedPayee(user);

    // The ten category chips are gone (handoff §5.4): the free text is what
    // the risk engine and David actually read.
    expect(screen.queryByRole('radio', { name: 'Bill or utility' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Other' })).not.toBeInTheDocument();
    expect(
      screen.getByText('In your own words. David sees this exactly as you write it.'),
    ).toBeInTheDocument();
  });

  it('will not leave step 2 without an amount', async () => {
    unlocked();
    const user = userEvent.setup();
    renderAt('/m/send');
    await trustedPayee(user);

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter an amount above zero.');
  });

  it('will not leave step 2 on an amount alone', async () => {
    unlocked();
    const user = userEvent.setup();
    renderAt('/m/send');
    await trustedPayee(user);

    await user.type(screen.getByLabelText('Amount in euros'), '62.40');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent('at least 10 characters');
  });

  it('will not send more than is in the account', async () => {
    unlocked();
    const user = userEvent.setup();
    renderAt('/m/send');
    await trustedPayee(user);

    await amountAndReason(user, '999999', 'Monthly electricity bill');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'That is more than you have in your account.',
    );
  });

  it('skips the safety questions for a trusted payee', async () => {
    unlocked();
    const user = userEvent.setup();
    renderAt('/m/send');
    await trustedPayee(user);
    await amountAndReason(user, '62.40', 'Monthly electricity bill');

    expect(screen.queryByRole('heading', { name: 'Safety questions' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Check and confirm' })).toBeInTheDocument();
    expect(
      screen.getByText('Skipped — this payee is on your trusted list.'),
    ).toBeInTheDocument();
  });

  it('still asks the safety questions for a payee who is not trusted', async () => {
    unlocked();
    const user = userEvent.setup();
    renderAt('/m/send');

    await user.click(screen.getByRole('radio', { name: /Rosewood Garden Care/ }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await amountAndReason(user, '62.40', 'Cutting back the front hedge');

    expect(screen.getByRole('heading', { name: 'Safety questions' })).toBeInTheDocument();
    expect(screen.getByText(/Step 3 of 3/)).toBeInTheDocument();
  });

  it('will not check a payment with a safety question unanswered', async () => {
    unlocked();
    const user = userEvent.setup();
    renderAt('/m/send');

    await user.click(screen.getByRole('radio', { name: /Rosewood Garden Care/ }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await amountAndReason(user, '62.40', 'Cutting back the front hedge');

    const questions = screen.getAllByRole('group');
    await user.click(within(questions[0]).getByRole('radio', { name: 'Yes' }));
    await user.click(screen.getByRole('button', { name: 'Check this payment' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please answer all three questions.');
  });

  it('does not score the reason text while it is being typed', async () => {
    unlocked();
    const user = userEvent.setup();
    renderAt('/m/send');
    await trustedPayee(user);

    await user.type(screen.getByLabelText('Amount in euros'), '4500');
    await user.type(
      screen.getByLabelText('Why are you sending this money?'),
      'Move my money to a safe account, urgent',
    );
    expect(screen.queryByText(/This looks like a scam/)).not.toBeInTheDocument();
    expect(screen.queryByText(/What we noticed/)).not.toBeInTheDocument();
  });

  it('sends an ordinary bill without approval, and shows no alarming language', async () => {
    unlocked();
    const user = userEvent.setup();
    renderAt('/m/send');
    await trustedPayee(user);
    await amountAndReason(user, '62.40', 'Monthly electricity bill');

    expect(screen.getByText('Looks normal')).toBeInTheDocument();
    expect(screen.getByText('This can be sent straight away.')).toBeInTheDocument();
    const panel = screen.getByRole('region', { name: /What we noticed/ });
    expect(panel.textContent).not.toMatch(/scam/i);
    expect(screen.queryByRole('heading', { name: /scam/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Send now' }));
    expect(await screen.findByText('Sent')).toBeInTheDocument();
  });

  it('routes a scam-shaped payment to the approver with a named explainer', async () => {
    unlocked();
    const user = userEvent.setup();
    renderAt('/m/send');

    await user.click(screen.getByRole('radio', { name: /Someone new/ }));
    await user.type(screen.getByLabelText('Their name'), 'Robert Klein');
    await user.type(screen.getByLabelText('Their account number (IBAN)'), 'DE00DEMO55667788');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await amountAndReason(
      user,
      '4500',
      'Bank fraud department told me to move my money to a safe account today, urgent, do not tell anyone',
    );

    const questions = screen.getAllByRole('group');
    await user.click(within(questions[0]).getByRole('radio', { name: 'Yes' }));
    await user.click(within(questions[1]).getByRole('radio', { name: 'Yes' }));
    await user.click(within(questions[2]).getByRole('radio', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: 'Check this payment' }));

    // The verdict is a heading addressed to her, not a badge.
    expect(
      screen.getByRole('heading', { name: /This looks like a scam, Margaret/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The "safe account" scam' })).toBeInTheDocument();
    // There is no way past this screen: no "send anyway", and no score.
    expect(screen.queryByRole('button', { name: /Send now/ })).not.toBeInTheDocument();
    const panel = screen.getByRole('region', { name: /What we noticed/ });
    expect(panel.textContent).not.toMatch(/100/);
  });

  it('ranks a wall of reasons into three named groups, hiding none of them', async () => {
    unlocked();
    const user = userEvent.setup();
    renderAt('/m/send');

    await user.click(screen.getByRole('radio', { name: /Someone new/ }));
    await user.type(screen.getByLabelText('Their name'), 'Robert Klein');
    await user.type(screen.getByLabelText('Their account number (IBAN)'), 'DE00DEMO55667788');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await amountAndReason(
      user,
      '4500',
      'Bank fraud department told me to move my money to a safe account today, urgent, do not tell anyone',
    );

    const questions = screen.getAllByRole('group');
    await user.click(within(questions[0]).getByRole('radio', { name: 'Yes' }));
    await user.click(within(questions[1]).getByRole('radio', { name: 'Yes' }));
    await user.click(within(questions[2]).getByRole('radio', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: 'Check this payment' }));

    const panel = screen.getByRole('region', { name: /What we noticed/ });
    // Real headings, so a screen reader gets the same three-part story.
    expect(
      within(panel).getByRole('heading', { name: '1 · What you were told' }),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole('heading', { name: '2 · Who got in touch' }),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole('heading', { name: '3 · Where the money would go' }),
    ).toBeInTheDocument();

    // Ranked, never hidden: every reason stays available behind the disclosure,
    // and the disclosure announces its own expanded state.
    const disclosure = within(panel).getByText(/See every detail we checked \(\d+\)/);
    const details = disclosure.closest('details');
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute('open');
    await user.click(disclosure);
    expect(details).toHaveAttribute('open');
  });
});
