export interface Note {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NoteFilter = 'all' | 'pinned';
export type SortDirection = 'asc' | 'desc';
export type NoteDraft = Partial<Note>;

const cleanText = (value: unknown): string => String(value ?? '').trim();

const isIsoDate = (value: unknown): value is string => {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
};

export function createNote(overrides: NoteDraft = {}): Note {
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

export function normalizeNote(value: NoteDraft): Note {
  const fallback = createNote();
  const createdAt = isIsoDate(value.createdAt) ? value.createdAt : fallback.createdAt;
  const updatedAt = isIsoDate(value.updatedAt) ? value.updatedAt : createdAt;

  return {
    id: cleanText(value.id) || fallback.id,
    title: String(value.title ?? ''),
    content: String(value.content ?? ''),
    pinned: Boolean(value.pinned),
    createdAt,
    updatedAt
  };
}

export function noteTitle(note: Pick<Note, 'title'>): string {
  return cleanText(note.title) || '未命名笔记';
}

export function preview(note: Pick<Note, 'content'>, max = 54): string {
  const normalized = cleanText(note.content).replace(/\s+/g, ' ');
  if (!normalized) return '暂无内容';
  return normalized.length > max ? `${normalized.slice(0, max)}…` : normalized;
}

export function countChars(text: string): number {
  return String(text ?? '').replace(/\s/g, '').length;
}

export function readingMinutes(text: string): number {
  return Math.max(1, Math.ceil(countChars(text) / 400));
}

export function filterNotes(notes: Note[], query = '', filter: NoteFilter = 'all'): Note[] {
  const q = cleanText(query).toLocaleLowerCase();
  return notes.filter(note => {
    if (filter === 'pinned' && !note.pinned) return false;
    if (!q) return true;
    return `${note.title} ${note.content}`.toLocaleLowerCase().includes(q);
  });
}

export function sortNotes(notes: Note[], direction: SortDirection = 'desc'): Note[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * factor;
  });
}

export function createSampleNotes(): Note[] {
  return [
    createNote({
      id: 'welcome',
      title: '欢迎使用292笔记',
      content: '这是一个简洁、专注的笔记空间。\n\n你可以在左侧创建和搜索笔记，编辑内容会自动保存在桌面客户端中。点击工具栏上的图钉，还可以把重要笔记置顶。',
      pinned: true,
      createdAt: '2026-07-11T08:00:00.000Z',
      updatedAt: '2026-07-11T08:00:00.000Z'
    }),
    createNote({
      id: 'ideas',
      title: '灵感收集箱',
      content: '随手记录突然出现的想法：\n\n• 周末整理书架\n• 尝试一个新的个人项目\n• 给很久没联系的朋友写封信',
      createdAt: '2026-07-10T10:30:00.000Z',
      updatedAt: '2026-07-10T10:30:00.000Z'
    }),
    createNote({
      id: 'reading',
      title: '七月阅读清单',
      content: '这个月想读完三本书，并为每本书写一页阅读笔记。保持轻松，不追求速度。',
      createdAt: '2026-07-08T12:00:00.000Z',
      updatedAt: '2026-07-08T12:00:00.000Z'
    })
  ];
}
