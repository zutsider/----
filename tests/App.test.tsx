import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../src/App';
import { createNote, type Note } from '../src/model/noteModel';

function makeNotes(): Note[] {
  return [
    createNote({
      id: 'work',
      title: '工作计划',
      content: '准备周会材料',
      pinned: true,
      createdAt: '2026-07-01T08:00:00.000Z',
      updatedAt: '2026-07-02T08:00:00.000Z'
    }),
    createNote({
      id: 'shopping',
      title: '购物清单',
      content: '牛奶 鸡蛋',
      createdAt: '2026-07-01T07:00:00.000Z',
      updatedAt: '2026-07-01T07:00:00.000Z'
    })
  ];
}

function installNotesApi(notes = makeNotes()) {
  const loadNotes = vi.fn().mockResolvedValue(notes);
  const saveNotes = vi.fn().mockResolvedValue(true);
  Object.defineProperty(window, 'notesApi', {
    configurable: true,
    value: { loadNotes, saveNotes }
  });
  return { loadNotes, saveNotes };
}

async function renderLoadedApp(notes = makeNotes()) {
  const api = installNotesApi(notes);
  render(<App />);
  await screen.findByDisplayValue(notes[0].title);
  return api;
}

describe('App', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('loads notes and renders the active editor', async () => {
    const api = await renderLoadedApp();

    expect(api.loadNotes).toHaveBeenCalled();
    expect(screen.getByDisplayValue('工作计划')).toBeTruthy();
    expect(screen.getByDisplayValue('准备周会材料')).toBeTruthy();
    expect(screen.getByText('6 字 · 预计阅读 1 分钟')).toBeTruthy();
  });

  it('creates a note and autosaves edits', async () => {
    const user = userEvent.setup();
    const api = await renderLoadedApp();

    await user.click(screen.getByRole('button', { name: /新建笔记/ }));
    await user.type(screen.getByLabelText('笔记标题'), '桌面想法');

    await waitFor(() => expect(api.saveNotes).toHaveBeenCalled());
    const savedNotes = api.saveNotes.mock.calls.at(-1)?.[0] as Note[];
    expect(savedNotes[0].title).toBe('桌面想法');
  });

  it('searches notes and filters pinned notes in the list', async () => {
    const user = userEvent.setup();
    await renderLoadedApp();
    const list = screen.getByRole('list');

    await user.type(screen.getByLabelText('搜索笔记'), '牛奶');
    expect(within(list).getByText('购物清单')).toBeTruthy();
    expect(within(list).queryByText('工作计划')).toBeNull();

    await user.clear(screen.getByLabelText('搜索笔记'));
    await user.click(screen.getByRole('button', { name: /已置顶/ }));
    expect(within(list).getByText('工作计划')).toBeTruthy();
    expect(within(list).queryByText('购物清单')).toBeNull();
  });

  it('confirms deletion before removing a note', async () => {
    const user = userEvent.setup();
    const api = await renderLoadedApp();

    await user.click(screen.getByRole('button', { name: '删除笔记' }));
    expect(screen.getByRole('dialog', { name: '删除这篇笔记？' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '确认删除' }));

    await waitFor(() => expect(api.saveNotes).toHaveBeenCalled());
    const savedNotes = api.saveNotes.mock.calls.at(-1)?.[0] as Note[];
    expect(savedNotes.map(note => note.id)).toEqual(['shopping']);
    expect(screen.getByDisplayValue('购物清单')).toBeTruthy();
  });

  it('switches theme and persists the preference locally', async () => {
    const user = userEvent.setup();
    await renderLoadedApp();

    await user.click(screen.getByRole('button', { name: '深色' }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('292-notes-theme')).toBe('dark');
  });

  it('highlights markdown syntax in edit mode and renders markdown preview', async () => {
    const user = userEvent.setup();
    await renderLoadedApp([
      createNote({
        id: 'markdown',
        title: 'Markdown 笔记',
        content: '# 标题\n\n**重点**\n\n- [x] 完成预览',
        updatedAt: '2026-07-03T08:00:00.000Z'
      })
    ]);

    expect(document.querySelector('.markdown-highlight .md-heading')).toBeTruthy();
    expect(screen.getByLabelText('笔记内容')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '预览' }));

    expect(screen.getByRole('heading', { level: 1, name: '标题' })).toBeTruthy();
    expect(screen.getByText('重点')).toBeTruthy();
    expect(screen.getByRole('checkbox')).toBeTruthy();
    expect(screen.queryByLabelText('笔记内容')).toBeNull();

    await user.click(screen.getByRole('button', { name: '编辑' }));
    expect(screen.getByLabelText('笔记内容')).toBeTruthy();
  });
});
