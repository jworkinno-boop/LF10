import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, within } from '@testing-library/react';
import { renderAt, seedStorage } from '../../test/renderApp';

function unlocked() {
  seedStorage((state) => ({
    ...state,
    unlocked: ['margaret', 'david'],
    activePersona: 'margaret',
  }));
}

async function completeStep1(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: /Northgate Energy/ }));
  await user.click(screen.getByRole('button', { name: 'Continue' }));
}

describe('the send wizard', () => {
  it('names the step in the heading and moves focus there', async () => {
    unlocked();
    const user = userEvent.setup();
    renderAt('/m/send');

    expect(screen.getByRole('heading', { name: /Who are you paying\? — Step 1 of 5/ })).toBeInTheDocument();
    await completeStep1(user);

    const heading = screen.getByRole('heading', { name: /How much\? — Step 2 of 5/ });
    expect(heading).toBeInTheDocument();
    expect(document.activeElement).toBe(heading);
  });

  it('offers a typable amount field as well as the keypad', async () => {
    unlocked();
    const user = userEvent.setup();
    renderAt('/m/send');
    await completeStep1(user);

    const amount = screen.getByLabelText('Amount in euros');
    await user.type(amount, '62.40');
    expect(screen.getByText(/sixty-two euros and forty cents/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Number keypad' })).toBeInTheDocument();
  });

  it('will not pass step 3 without a category and ten characters', async () => {
    unlocked();
    const user = userEvent.setup();
    renderAt('/m/send');
    await completeStep1(user);
    await user.type(screen.getByLabelText('Amount in euros'), '62.40');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please pick the closest reason.');

    await user.click(screen.getByRole('radio', { name: 'Bill or utility' }));
    await user.type(screen.getByLabelText('Tell us in your own words'), 'gas');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent('at least 10 characters');

    await user.type(screen.getByLabelText('Tell us in your own words'), ' and electricity bill');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { name: /Safety check — Step 4 of 5/ })).toBeInTheDocument();
  });

  it('does not score the reason text while it is being typed', async () => {
    unlocked();
    const user = userEvent.setup();
    renderAt('/m/send');
    await completeStep1(user);
    await user.type(screen.getByLabelText('Amount in euros'), '4500');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('radio', { name: 'Other' }));
    await user.type(
      screen.getByLabelText('Tell us in your own words'),
      'Move my money to a safe account, urgent',
    );
    expect(screen.queryByText(/This looks like a scam/)).not.toBeInTheDocument();
    expect(screen.queryByText(/What we noticed/)).not.toBeInTheDocument();
  });

  it('sends an ordinary bill without approval, and shows no alarming language', async () => {
    unlocked();
    const user = userEvent.setup();
    renderAt('/m/send');
    await completeStep1(user);
    await user.type(screen.getByLabelText('Amount in euros'), '62.40');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('radio', { name: 'Bill or utility' }));
    await user.type(screen.getByLabelText('Tell us in your own words'), 'Monthly electricity bill');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    const questions = screen.getAllByRole('group');
    await user.click(within(questions[0]).getByRole('radio', { name: 'No' }));
    await user.click(within(questions[1]).getByRole('radio', { name: 'No' }));
    await user.click(within(questions[2]).getByRole('radio', { name: 'Yes' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await user.click(screen.getByRole('button', { name: 'Check this payment' }));
    expect(screen.getByText('Looks normal')).toBeInTheDocument();
    expect(screen.getByText('This can be sent straight away.')).toBeInTheDocument();
    // No scam explainer, and no alarming language in the assessment itself.
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

    await user.type(screen.getByLabelText('Amount in euros'), '4500');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await user.click(screen.getByRole('radio', { name: 'Other' }));
    await user.type(
      screen.getByLabelText('Tell us in your own words'),
      'Bank fraud department told me to move my money to a safe account today, urgent, do not tell anyone',
    );
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    const questions = screen.getAllByRole('group');
    await user.click(within(questions[0]).getByRole('radio', { name: 'Yes' }));
    await user.click(within(questions[1]).getByRole('radio', { name: 'Yes' }));
    await user.click(within(questions[2]).getByRole('radio', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await user.click(screen.getByRole('button', { name: 'Check this payment' }));
    expect(screen.getByText('This looks like a scam')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The "safe account" scam' })).toBeInTheDocument();
    // Five or more named reasons, and never the number.
    const panel = screen.getByRole('region', { name: /What we noticed/ });
    expect(within(panel).getAllByRole('listitem').length).toBeGreaterThanOrEqual(5);
    expect(panel.textContent).not.toMatch(/100/);
  });
});
