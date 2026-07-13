(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.NoteModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const cleanText = value => String(value ?? '').trim();

  function createNote(overrides = {}) {
    const now = overrides.updatedAt || new Date().toISOString();
    return {
      id: overrides.id || `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: overrides.title ?? '',
      content: overrides.content ?? '',
      pinned: Boolean(overrides.pinned),
      createdAt: overrides.createdAt || now,
      updatedAt: now
    };
  }

  function noteTitle(note) {
    return cleanText(note.title) || '未命名笔记';
  }

  function preview(note, max = 54) {
    const normalized = cleanText(note.content).replace(/\s+/g, ' ');
    if (!normalized) return '暂无内容';
    return normalized.length > max ? `${normalized.slice(0, max)}…` : normalized;
  }

  function countChars(text) {
    return String(text ?? '').replace(/\s/g, '').length;
  }

  function readingMinutes(text) {
    return Math.max(1, Math.ceil(countChars(text) / 400));
  }

  function filterNotes(notes, query = '', filter = 'all') {
    const q = cleanText(query).toLocaleLowerCase();
    return notes.filter(note => {
      if (filter === 'pinned' && !note.pinned) return false;
      if (!q) return true;
      return `${note.title} ${note.content}`.toLocaleLowerCase().includes(q);
    });
  }

  function sortNotes(notes, direction = 'desc') {
    const factor = direction === 'asc' ? 1 : -1;
    return [...notes].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (new Date(a.updatedAt) - new Date(b.updatedAt)) * factor;
    });
  }

  return { createNote, noteTitle, preview, countChars, readingMinutes, filterNotes, sortNotes };
});
