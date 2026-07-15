import type { Note } from '../model/noteModel';

declare global {
  interface Window {
    notesApi?: {
      loadNotes: () => Promise<Note[]>;
      saveNotes: (notes: Note[]) => Promise<boolean>;
    };
  }
}

export {};
