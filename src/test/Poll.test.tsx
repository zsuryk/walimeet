import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Poll from '../pages/Poll';
import { ThemeProvider } from '../lib/theme';
import { getPoll, respondToPoll, ApiError } from '../lib/api';
import type { Poll as PollType, ParticipantResponse } from '../lib/types';

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return {
    ...actual,
    getPoll: vi.fn(),
    respondToPoll: vi.fn(),
  };
});

const mockGetPoll = vi.mocked(getPoll);
const mockRespondToPoll = vi.mocked(respondToPoll);

const POLL_ID = 'poll-1';
const SLOT_KEY = '2026-10-05-09:00';
// jsdom serializes hsla(231, 84%, 56%, 0.35) (the "my selection" fill) to rgba
const MY_SELECTION_BG = 'rgba(49, 77, 237, 0.35)';

function makeResponse(
  name: string,
  overrides: Partial<ParticipantResponse> = {}
): ParticipantResponse {
  return {
    name,
    availabilities: { [SLOT_KEY]: true },
    submittedAt: Date.now(),
    ...overrides,
  };
}

function makePoll(overrides: Partial<PollType> = {}): PollType {
  return {
    id: POLL_ID,
    name: 'Team standup',
    description: 'Weekly sync',
    dates: ['2026-10-05'],
    timeRange: { start: '09:00', end: '10:00' },
    timezone: 'UTC',
    slotMinutes: 15,
    creatorName: 'Alice',
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    responses: {},
    ...overrides,
  };
}

function renderPoll() {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[`/poll/${POLL_ID}`]}>
        <Routes>
          <Route path="/poll/:id" element={<Poll />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

async function startEditAndMarkSlot(user: UserEvent): Promise<void> {
  await screen.findByRole('heading', { name: 'Team standup' });
  await user.click(screen.getByRole('button', { name: 'Add availability' }));
  const cell = screen.getAllByRole('gridcell')[0];
  cell.focus();
  await user.keyboard(' ');
}

async function openSubmitModal(user: UserEvent): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Submit' }));
  await screen.findByRole('dialog');
}

async function typeAndConfirm(user: UserEvent, name: string): Promise<void> {
  await user.type(screen.getByLabelText(/your name/i), name);
  await user.click(
    screen.getByRole('button', { name: 'Confirm & Submit' })
  );
}

beforeEach(() => {
  mockGetPoll.mockResolvedValue(makePoll());
  mockRespondToPoll.mockResolvedValue(makePoll());
});

describe('editing when others have already responded', () => {
  it('shows my selection on the grid, not only the overall heat map', async () => {
    mockGetPoll.mockResolvedValue(
      makePoll({ responses: { alex: makeResponse('Alex') } })
    );
    const user = userEvent.setup();
    renderPoll();
    await startEditAndMarkSlot(user);

    // cell[0] = SLOT_KEY, which Alex also marked
    const cell = screen.getAllByRole('gridcell')[0];
    expect(cell).toHaveAttribute('aria-selected', 'true');
    expect(cell).toHaveAttribute('data-my-selected', 'true');
    expect(cell.style.backgroundColor).toBe(MY_SELECTION_BG);
  });

  it('shows my selection on a slot nobody else marked', async () => {
    mockGetPoll.mockResolvedValue(
      makePoll({ responses: { alex: makeResponse('Alex') } })
    );
    const user = userEvent.setup();
    renderPoll();
    await screen.findByRole('heading', { name: 'Team standup' });
    await user.click(screen.getByRole('button', { name: 'Add availability' }));

    // cell[1] = 09:15, where Alex is not available (count = 0)
    const cells = screen.getAllByRole('gridcell');
    cells[1].focus();
    await user.keyboard(' ');

    expect(cells[1]).toHaveAttribute('data-my-selected', 'true');
    expect(cells[1].style.backgroundColor).toBe(MY_SELECTION_BG);
  });
});

describe('participant inspection', () => {
  async function renderWithAlex(): Promise<UserEvent> {
    mockGetPoll.mockResolvedValue(
      makePoll({ responses: { alex: makeResponse('Alex') } })
    );
    const user = userEvent.setup();
    renderPoll();
    await screen.findByRole('heading', { name: 'Team standup' });
    return user;
  }

  it('shows participant chips above the grid so hover feedback is on screen', async () => {
    await renderWithAlex();
    const chip = screen.getByRole('button', { name: 'Alex' });
    const grid = screen.getByRole('grid');
    expect(
      chip.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('pins a participant on click so the lens survives the mouse leaving', async () => {
    const user = await renderWithAlex();
    const chip = screen.getByRole('button', { name: 'Alex' });
    await user.click(chip);
    await user.unhover(chip);

    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Viewing Alex/)).toBeInTheDocument();

    const cells = screen.getAllByRole('gridcell');
    // slot Alex marked → lens fill
    expect(cells[0].style.backgroundColor).toBe('rgba(49, 77, 237, 0.6)');
    // slot Alex did not mark → lens "unavailable" gray
    expect(cells[1].className).toContain('bg-gray-100');
  });

  it('clears the pin when Stop viewing is pressed', async () => {
    const user = await renderWithAlex();
    const chip = screen.getByRole('button', { name: 'Alex' });
    await user.click(chip);
    await user.click(screen.getByRole('button', { name: 'Stop viewing' }));

    expect(screen.queryByText(/Viewing Alex/)).not.toBeInTheDocument();
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    const cells = screen.getAllByRole('gridcell');
    expect(cells[1].className).not.toContain('bg-gray-100');
  });
});

describe('creator attribution', () => {
  it('renders the creator name on the poll page', async () => {
    renderPoll();
    expect(await screen.findByText('Created by Alice')).toBeInTheDocument();
  });

  it('keeps attribution visible while editing availability', async () => {
    const user = userEvent.setup();
    renderPoll();
    await startEditAndMarkSlot(user);
    expect(screen.getByText('Created by Alice')).toBeInTheDocument();
  });

  it('falls back to Anonymous when the creator name is empty', async () => {
    mockGetPoll.mockResolvedValue(makePoll({ creatorName: '' }));
    renderPoll();
    expect(await screen.findByText('Created by Anonymous')).toBeInTheDocument();
  });

  it('falls back to Anonymous when the creator name is whitespace', async () => {
    mockGetPoll.mockResolvedValue(makePoll({ creatorName: '   ' }));
    renderPoll();
    expect(await screen.findByText('Created by Anonymous')).toBeInTheDocument();
  });
});

describe('submit flow — fresh name', () => {
  it('issues a single PUT with the trimmed name and marked slots', async () => {
    const user = userEvent.setup();
    renderPoll();
    await startEditAndMarkSlot(user);
    await openSubmitModal(user);
    await typeAndConfirm(user, 'Bob');

    await waitFor(() =>
      expect(mockRespondToPoll).toHaveBeenCalledTimes(1)
    );
    expect(mockRespondToPoll).toHaveBeenCalledWith(POLL_ID, {
      name: 'Bob',
      availabilities: { [SLOT_KEY]: true },
    });
  });

  it('renders submit errors inside the modal without native dialogs', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false);
    const promptSpy = vi.spyOn(window, 'prompt').mockImplementation(() => null);
    mockRespondToPoll.mockRejectedValue(
      new ApiError('Invalid input', 400, 'bad-request')
    );

    const user = userEvent.setup();
    renderPoll();
    await startEditAndMarkSlot(user);
    await openSubmitModal(user);
    await typeAndConfirm(user, 'Bob');

    const dialog = await screen.findByRole('dialog');
    expect(
      await within(dialog).findByRole('alert')
    ).toHaveTextContent('Invalid input');

    expect(alertSpy).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(promptSpy).not.toHaveBeenCalled();
  });

  it('flashes Saved for a new response', async () => {
    const user = userEvent.setup();
    renderPoll();
    await startEditAndMarkSlot(user);
    await openSubmitModal(user);
    await typeAndConfirm(user, 'Bob');

    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });
});

describe('submit flow — name collision prompt', () => {
  it('shows the prompt instead of PUTting when the name belongs to someone else', async () => {
    mockGetPoll.mockResolvedValue(
      makePoll({ responses: { alex: makeResponse('Alex') } })
    );
    const user = userEvent.setup();
    renderPoll();
    await startEditAndMarkSlot(user);
    await openSubmitModal(user);
    await typeAndConfirm(user, 'Alex');

    expect(
      await screen.findByText('A response already exists for this name.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change name' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit existing' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Overwrite' })
    ).not.toBeInTheDocument();
    expect(mockRespondToPoll).not.toHaveBeenCalled();
  });

  it('loads the existing response when Edit existing is chosen, then PUTs the merged result', async () => {
    mockGetPoll.mockResolvedValue(
      makePoll({ responses: { alex: makeResponse('Alex') } })
    );
    mockRespondToPoll.mockResolvedValue(
      makePoll({ responses: { alex: makeResponse('Alex') } })
    );
    const user = userEvent.setup();
    renderPoll();
    await screen.findByRole('heading', { name: 'Team standup' });
    await user.click(screen.getByRole('button', { name: 'Add availability' }));

    // draft marks 09:15 only
    const draftCell = screen.getAllByRole('gridcell')[1];
    draftCell.focus();
    await user.keyboard(' ');
    await openSubmitModal(user);
    await typeAndConfirm(user, 'Alex');

    await user.click(
      await screen.findByRole('button', { name: 'Edit existing' })
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );

    // Alex's response replaced the draft: 09:00 loaded, 09:15 gone
    let cells = screen.getAllByRole('gridcell');
    expect(cells[0]).toHaveAttribute('data-my-selected', 'true');
    expect(cells[1]).not.toHaveAttribute('data-my-selected', 'true');
    expect(mockRespondToPoll).not.toHaveBeenCalled();

    // adjust, then submit through the read-only confirmation
    cells[2].focus();
    await user.keyboard(' ');
    await openSubmitModal(user);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Update availability');
    expect(dialog).toHaveTextContent('Updating Alex’s availability');
    expect(
      within(dialog).queryByLabelText(/your name/i)
    ).not.toBeInTheDocument();

    await user.click(
      within(dialog).getByRole('button', { name: 'Confirm & Submit' })
    );

    await waitFor(() =>
      expect(mockRespondToPoll).toHaveBeenCalledWith(POLL_ID, {
        name: 'Alex',
        availabilities: { [SLOT_KEY]: true, '2026-10-05-09:30': true },
      })
    );
    expect(
      await screen.findByText('Updated Alex’s availability')
    ).toBeInTheDocument();
  });

  it('keeps grid edits and lets the user rename when choosing Change name', async () => {
    mockGetPoll.mockResolvedValue(
      makePoll({ responses: { alex: makeResponse('Alex') } })
    );
    mockRespondToPoll.mockResolvedValue(makePoll());
    const user = userEvent.setup();
    renderPoll();
    await startEditAndMarkSlot(user);
    await openSubmitModal(user);
    await typeAndConfirm(user, 'Alex');

    await user.click(
      await screen.findByRole('button', { name: 'Change name' })
    );

    // prompt dismissed, modal still open, name field editable again
    expect(
      screen.queryByText('A response already exists for this name.')
    ).not.toBeInTheDocument();
    const nameInput = screen.getByLabelText(/your name/i);
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toHaveFocus();
    expect(mockRespondToPoll).not.toHaveBeenCalled();

    // rename and confirm — availabilities from the grid are preserved
    await user.clear(nameInput);
    await user.type(nameInput, 'Bob');
    await user.click(screen.getByRole('button', { name: 'Confirm & Submit' }));

    await waitFor(() =>
      expect(mockRespondToPoll).toHaveBeenCalledWith(POLL_ID, {
        name: 'Bob',
        availabilities: { [SLOT_KEY]: true },
      })
    );
  });

  it('detects collisions case-insensitively with surrounding whitespace', async () => {
    mockGetPoll.mockResolvedValue(
      makePoll({ responses: { alex: makeResponse('Alex') } })
    );
    const user = userEvent.setup();
    renderPoll();
    await startEditAndMarkSlot(user);
    await openSubmitModal(user);
    await typeAndConfirm(user, '  ALEX  ');

    expect(
      await screen.findByText('A response already exists for this name.')
    ).toBeInTheDocument();
    expect(mockRespondToPoll).not.toHaveBeenCalled();
  });
});

describe('edit existing response via pencil', () => {
  async function renderWithAlex(): Promise<UserEvent> {
    mockGetPoll.mockResolvedValue(
      makePoll({ responses: { alex: makeResponse('Alex') } })
    );
    const user = userEvent.setup();
    renderPoll();
    await screen.findByRole('heading', { name: 'Team standup' });
    return user;
  }

  it('shows a pencil button beside each participant chip', async () => {
    await renderWithAlex();
    expect(
      screen.getByRole('button', { name: 'Edit Alex' })
    ).toBeInTheDocument();
    // chip itself keeps its own accessible name
    expect(screen.getByRole('button', { name: 'Alex' })).toBeInTheDocument();
  });

  it('loads the response onto the grid and submits under that name', async () => {
    const user = await renderWithAlex();
    mockRespondToPoll.mockResolvedValue(
      makePoll({ responses: { alex: makeResponse('Alex') } })
    );

    await user.click(screen.getByRole('button', { name: 'Edit Alex' }));

    // Alex's slots loaded as "mine", name not re-entered, nothing changed yet
    const cells = screen.getAllByRole('gridcell');
    expect(cells[0]).toHaveAttribute('data-my-selected', 'true');
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();

    // adjust: add 09:15 on top of the loaded response
    cells[1].focus();
    await user.keyboard(' ');
    await openSubmitModal(user);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Update availability');
    expect(dialog).toHaveTextContent('Updating Alex’s availability');
    expect(
      within(dialog).queryByLabelText(/your name/i)
    ).not.toBeInTheDocument();

    await user.click(
      within(dialog).getByRole('button', { name: 'Confirm & Submit' })
    );

    await waitFor(() =>
      expect(mockRespondToPoll).toHaveBeenCalledWith(POLL_ID, {
        name: 'Alex',
        availabilities: { [SLOT_KEY]: true, '2026-10-05-09:15': true },
      })
    );
    expect(
      await screen.findByText('Updated Alex’s availability')
    ).toBeInTheDocument();
  });

  it('confirms before switching to another response while unsaved changes exist', async () => {
    mockGetPoll.mockResolvedValue(
      makePoll({
        responses: {
          alex: makeResponse('Alex'),
          bob: makeResponse('Bob', { availabilities: { '2026-10-05-09:30': true } }),
        },
      })
    );
    const user = userEvent.setup();
    renderPoll();
    await screen.findByRole('heading', { name: 'Team standup' });
    await user.click(screen.getByRole('button', { name: 'Add availability' }));

    // draft marks 09:15 only
    let cells = screen.getAllByRole('gridcell');
    cells[1].focus();
    await user.keyboard(' ');

    await user.click(screen.getByRole('button', { name: 'Edit Alex' }));

    // confirm first — draft untouched until Discard
    expect(await screen.findByText('Discard changes?')).toBeInTheDocument();
    cells = screen.getAllByRole('gridcell');
    expect(cells[1]).toHaveAttribute('data-my-selected', 'true');
    expect(cells[0]).not.toHaveAttribute('data-my-selected', 'true');

    await user.click(screen.getByRole('button', { name: 'Discard' }));

    cells = screen.getAllByRole('gridcell');
    expect(cells[0]).toHaveAttribute('data-my-selected', 'true');
    expect(cells[1]).not.toHaveAttribute('data-my-selected', 'true');
    expect(screen.queryByText('Discard changes?')).not.toBeInTheDocument();
  });
});

describe('guards and gating', () => {
  it('keeps Submit disabled until the grid changes', async () => {
    const user = userEvent.setup();
    renderPoll();
    await screen.findByRole('heading', { name: 'Team standup' });
    await user.click(screen.getByRole('button', { name: 'Add availability' }));

    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();

    const cell = screen.getAllByRole('gridcell')[0];
    cell.focus();
    await user.keyboard(' ');

    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
  });

  it('asks for confirmation when Cancel is pressed with unsaved changes', async () => {
    const user = userEvent.setup();
    renderPoll();
    await screen.findByRole('heading', { name: 'Team standup' });
    await user.click(screen.getByRole('button', { name: 'Add availability' }));

    const cell = screen.getAllByRole('gridcell')[0];
    cell.focus();
    await user.keyboard(' ');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('Discard changes?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.queryByText('Discard changes?')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
  });
});
