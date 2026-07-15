// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadNotes, notesFilePath, saveNotes } from '../electron/storage';
import { createNote } from '../src/model/noteModel';

let tempDir = '';

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'mark-notes-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('storage', () => {
  it('returns sample notes when the file is missing', async () => {
    const notes = await loadNotes(notesFilePath(tempDir));
    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0].title).toBe('欢迎使用292笔记');
  });

  it('returns sample notes for invalid JSON', async () => {
    const filePath = notesFilePath(tempDir);
    await writeFile(filePath, '{not-json', 'utf8');

    const notes = await loadNotes(filePath);
    expect(notes[0].title).toBe('欢迎使用292笔记');
  });

  it('loads valid notes from disk', async () => {
    const filePath = notesFilePath(tempDir);
    const note = createNote({ id: 'disk-note', title: '磁盘笔记', content: '已保存' });
    await writeFile(filePath, JSON.stringify([note]), 'utf8');

    const notes = await loadNotes(filePath);
    expect(notes).toHaveLength(1);
    expect(notes[0].id).toBe('disk-note');
    expect(notes[0].title).toBe('磁盘笔记');
  });

  it('saves notes so they can be read again', async () => {
    const filePath = notesFilePath(tempDir);
    const note = createNote({ id: 'saved-note', title: '保存测试', content: '桌面数据' });

    await saveNotes(filePath, [note]);

    const raw = await readFile(filePath, 'utf8');
    expect(raw).toContain('保存测试');
    const loaded = await loadNotes(filePath);
    expect(loaded[0].content).toBe('桌面数据');
  });
});
