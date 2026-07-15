import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createSampleNotes, normalizeNote, type Note } from '../src/model/noteModel';

export const NOTES_FILE_NAME = 'notes-data.json';

export function notesFilePath(userDataPath: string): string {
  return path.join(userDataPath, NOTES_FILE_NAME);
}

export async function loadNotes(filePath: string): Promise<Note[]> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return createSampleNotes();

    const notes = parsed.map(item => normalizeNote(item as Partial<Note>));
    return notes.length ? notes : createSampleNotes();
  } catch {
    return createSampleNotes();
  }
}

export async function saveNotes(filePath: string, notes: Note[]): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const normalized = notes.map(note => normalizeNote(note));
  await writeFile(filePath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
}
