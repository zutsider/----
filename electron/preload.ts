import { contextBridge, ipcRenderer } from 'electron';

import type { Note } from '../src/model/noteModel';

contextBridge.exposeInMainWorld('notesApi', {
  loadNotes: (): Promise<Note[]> => ipcRenderer.invoke('notes:load'),
  saveNotes: (notes: Note[]): Promise<boolean> => ipcRenderer.invoke('notes:save', notes)
});
