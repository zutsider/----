import { describe, expect, it } from 'vitest';

import {
  countChars,
  createNote,
  filterNotes,
  noteTitle,
  preview,
  readingMinutes,
  sortNotes,
  type Note
} from '../src/model/noteModel';

describe('noteModel', () => {
  it('creates a valid independent note', () => {
    const note = createNote({ title: '测试', content: '内容' });
    expect(note.id.startsWith('note-')).toBe(true);
    expect(note.title).toBe('测试');
    expect(note.pinned).toBe(false);
    expect(Number.isNaN(Date.parse(note.updatedAt))).toBe(false);
  });

  it('falls back for blank titles', () => {
    expect(noteTitle({ title: '   ' })).toBe('未命名笔记');
    expect(noteTitle({ title: '计划' })).toBe('计划');
  });

  it('normalizes previews and truncates safely', () => {
    expect(preview({ content: '  第一行\n\n第二行  ' })).toBe('第一行 第二行');
    expect(preview({ content: '' })).toBe('暂无内容');
    expect(preview({ content: '123456' }, 4)).toBe('1234…');
  });

  it('counts characters and estimates reading time', () => {
    expect(countChars('你好 world\n')).toBe(7);
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes('字'.repeat(401))).toBe(2);
  });

  it('filters title/content and honors pinned filter', () => {
    const notes = [
      createNote({ title: '工作', content: '会议', pinned: true }),
      createNote({ title: '生活', content: '购买牛奶', pinned: false })
    ];

    expect(filterNotes(notes, '牛奶')).toHaveLength(1);
    expect(filterNotes(notes, '', 'pinned')).toHaveLength(1);
    expect(filterNotes(notes, '工作', 'pinned')[0].title).toBe('工作');
  });

  it('keeps pinned notes first and sorts by update time', () => {
    const notes: Note[] = [
      createNote({ id: 'old', pinned: false, updatedAt: '2025-01-01T00:00:00.000Z' }),
      createNote({ id: 'pin', pinned: true, updatedAt: '2024-01-01T00:00:00.000Z' }),
      createNote({ id: 'new', pinned: false, updatedAt: '2026-01-01T00:00:00.000Z' })
    ];

    expect(sortNotes(notes, 'desc').map(note => note.id)).toEqual(['pin', 'new', 'old']);
    expect(sortNotes(notes, 'asc').map(note => note.id)).toEqual(['pin', 'old', 'new']);
  });
});
