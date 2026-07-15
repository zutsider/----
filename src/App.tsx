import { useEffect, useMemo, useRef, useState } from 'react';

import {
  countChars,
  createNote,
  createSampleNotes,
  filterNotes,
  noteTitle,
  preview,
  readingMinutes,
  sortNotes,
  type Note,
  type NoteFilter,
  type SortDirection
} from './model/noteModel';

type Theme = 'light' | 'dark';
type SaveState = 'saved' | 'saving' | 'error';

const THEME_KEY = '292-notes-theme';
const LEGACY_THEME_KEY = 'mark-notes-theme';
const SAVE_DEBOUNCE_MS = 350;

const fallbackApi = {
  loadNotes: async (): Promise<Note[]> => createSampleNotes(),
  saveNotes: async (): Promise<boolean> => true
};

function getApi() {
  return window.notesApi ?? fallbackApi;
}

function relativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((start.getTime() - target.getTime()) / 86400000);
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days > 1 && days < 7) return `${days} 天前`;
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(date);
}

function fullDate(iso: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(iso));
}

function initialTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY) ?? localStorage.getItem(LEGACY_THEME_KEY);
  return saved === 'dark' ? 'dark' : 'light';
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<NoteFilter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortDirection>('desc');
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState('');

  const searchRef = useRef<HTMLInputElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const loadedRef = useRef(false);
  const savedSnapshotRef = useRef('');
  const toastTimerRef = useRef<number | undefined>(undefined);

  const activeNote = useMemo(() => notes.find(note => note.id === activeId) ?? null, [activeId, notes]);
  const visibleNotes = useMemo(() => sortNotes(filterNotes(notes, query, filter), sort), [filter, notes, query, sort]);
  const allCount = notes.length;
  const pinnedCount = notes.filter(note => note.pinned).length;
  const listTitle = query ? '搜索结果' : filter === 'pinned' ? '置顶笔记' : '最近笔记';

  const showToast = (message: string) => {
    window.clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 1800);
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const loaded = await getApi().loadNotes();
        if (cancelled) return;
        setNotes(loaded);
        setActiveId(loaded[0]?.id ?? null);
        savedSnapshotRef.current = JSON.stringify(loaded);
      } catch {
        if (cancelled) return;
        const samples = createSampleNotes();
        setLoadError('读取本地笔记失败，已加载默认示例。');
        setNotes(samples);
        setActiveId(samples[0]?.id ?? null);
        savedSnapshotRef.current = JSON.stringify(samples);
      } finally {
        if (!cancelled) {
          loadedRef.current = true;
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    const snapshot = JSON.stringify(notes);
    if (snapshot === savedSnapshotRef.current) return;

    setSaveState('saving');
    const timer = window.setTimeout(() => {
      void getApi()
        .saveNotes(notes)
        .then(() => {
          savedSnapshotRef.current = snapshot;
          setSaveState('saved');
        })
        .catch(() => {
          setSaveState('error');
          showToast('保存失败，请检查应用数据目录权限');
        });
    }, SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [notes]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.body.classList.toggle('sidebar-open', sidebarOpen);
    return () => document.body.classList.remove('sidebar-open');
  }, [sidebarOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (mod && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        createNewNote();
      }
      if (event.key === 'Escape') {
        setDeleteOpen(false);
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  });

  function createNewNote() {
    const note = createNote();
    setNotes(current => [note, ...current]);
    setActiveId(note.id);
    setFilter('all');
    setQuery('');
    setSidebarOpen(false);
    window.setTimeout(() => titleRef.current?.focus(), 0);
    showToast('已创建新笔记');
  }

  function updateActive(field: 'title' | 'content', value: string) {
    if (!activeId) return;
    const updatedAt = new Date().toISOString();
    setNotes(current => current.map(note => (note.id === activeId ? { ...note, [field]: value, updatedAt } : note)));
  }

  function togglePin() {
    if (!activeNote) return;
    const updatedAt = new Date().toISOString();
    setNotes(current =>
      current.map(note => (note.id === activeNote.id ? { ...note, pinned: !note.pinned, updatedAt } : note))
    );
    showToast(activeNote.pinned ? '已取消置顶' : '笔记已置顶');
  }

  function deleteActive() {
    if (!activeNote) return;
    const index = notes.findIndex(note => note.id === activeNote.id);
    const nextNotes = notes.filter(note => note.id !== activeNote.id);
    const nextActive = nextNotes[Math.min(index, nextNotes.length - 1)]?.id ?? null;
    setNotes(nextNotes);
    setActiveId(nextActive);
    setDeleteOpen(false);
    showToast('笔记已删除');
  }

  function switchTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    showToast(nextTheme === 'dark' ? '已切换至深色模式' : '已切换至浅色模式');
  }

  if (loading) {
    return <div className="loading-screen">正在加载笔记...</div>;
  }

  const chars = activeNote ? countChars(activeNote.content) : 0;

  return (
    <>
      <div className="app-shell">
        <aside className="sidebar" aria-label="笔记列表">
          <header className="brand-row">
            <a className="brand" href="#" aria-label="292笔记首页" onClick={event => event.preventDefault()}>
              <span className="brand-mark" aria-hidden="true">292</span>
              <span>292笔记</span>
            </a>
            <button className="icon-button mobile-close" type="button" aria-label="关闭笔记列表" onClick={() => setSidebarOpen(false)}>×</button>
          </header>

          <button className="new-note-button" type="button" onClick={createNewNote}>
            <span aria-hidden="true">＋</span>
            新建笔记
            <kbd>N</kbd>
          </button>

          <div className="search-wrap">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21 21-4.35-4.35m2.35-5.65A8 8 0 1 1 3 11a8 8 0 0 1 16 0Z" /></svg>
            <input
              ref={searchRef}
              type="search"
              placeholder="搜索笔记..."
              autoComplete="off"
              aria-label="搜索笔记"
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
            <kbd>⌘K</kbd>
          </div>

          <nav className="filters" aria-label="笔记筛选">
            <button
              className={`filter-button ${filter === 'all' ? 'active' : ''}`}
              type="button"
              onClick={() => setFilter('all')}
            >
              <span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h6" /></svg>全部笔记</span>
              <span className="filter-count">{allCount}</span>
            </button>
            <button
              className={`filter-button ${filter === 'pinned' ? 'active' : ''}`}
              type="button"
              onClick={() => setFilter('pinned')}
            >
              <span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m12 17-5 5v-8l-3-3 7-7 3 3 6-1-7 7 3 3Z" /></svg>已置顶</span>
              <span className="filter-count">{pinnedCount}</span>
            </button>
          </nav>

          <div className="list-heading">
            <span>{listTitle}</span>
            <button
              className="sort-button"
              type="button"
              title="切换排序"
              aria-label={`当前按${sort === 'desc' ? '最新' : '最早'}修改排序`}
              onClick={() => setSort(current => (current === 'desc' ? 'asc' : 'desc'))}
            >
              {sort === 'desc' ? '最新修改 ↓' : '最早修改 ↑'}
            </button>
          </div>

          <div className="notes-list" role="list">
            {visibleNotes.length ? (
              visibleNotes.map(note => (
                <button
                  key={note.id}
                  className={`note-card ${note.id === activeId ? 'active' : ''}`}
                  role="listitem"
                  type="button"
                  onClick={() => {
                    setActiveId(note.id);
                    setSidebarOpen(false);
                  }}
                >
                  <div className="note-card-title">
                    {note.pinned ? <span className="pin" aria-label="已置顶">●</span> : null}
                    {noteTitle(note)}
                  </div>
                  <p className="note-card-preview">{preview(note)}</p>
                  <div className="note-card-meta"><span>{relativeDate(note.updatedAt)}</span><i></i><span>{countChars(note.content)} 字</span></div>
                </button>
              ))
            ) : (
              <div className="no-results">{query ? '没有找到匹配的笔记' : '这里还没有笔记'}</div>
            )}
          </div>

          <footer className="sidebar-footer">
            <span><i className="status-dot"></i><span>{saveState === 'error' ? '保存失败' : '已保存到本地'}</span></span>
            <div className="theme-switch" role="group" aria-label="主题切换">
              <button
                className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                type="button"
                aria-pressed={theme === 'light'}
                title="浅色模式"
                onClick={() => switchTheme('light')}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.64 5.64l1.42 1.42M16.94 16.94l1.42 1.42M18.36 5.64l-1.42 1.42M7.06 16.94l-1.42 1.42" /><circle cx="12" cy="12" r="4" /></svg>
                <span>浅色</span>
              </button>
              <button
                className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                type="button"
                aria-pressed={theme === 'dark'}
                title="深色模式"
                onClick={() => switchTheme('dark')}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.7 6.7 0 0 0 9.8 9.8Z" /></svg>
                <span>深色</span>
              </button>
            </div>
          </footer>
        </aside>

        <main className="editor">
          <div className="mobile-bar">
            <button className="icon-button" type="button" aria-label="打开笔记列表" onClick={() => setSidebarOpen(true)}>☰</button>
            <span>292笔记</span>
          </div>

          {!activeNote ? (
            <section className="empty-state">
              <div className="empty-icon">✎</div>
              <h1>开始记录你的想法</h1>
              <p>创建一篇新笔记，让灵感不再溜走。</p>
              <button className="new-note-button compact" type="button" onClick={createNewNote}>＋ 新建笔记</button>
            </section>
          ) : (
            <section className="editor-panel">
              <header className="editor-toolbar">
                <div className="breadcrumb"><span>我的笔记</span><b>/</b><span>{noteTitle(activeNote)}</span></div>
                <div className="toolbar-actions">
                  <span className={`save-state ${saveState === 'saving' ? 'saving' : ''}`}><i></i>{saveState === 'saving' ? '保存中...' : saveState === 'error' ? '保存失败' : '已保存'}</span>
                  <button
                    className={`icon-button ${activeNote.pinned ? 'active' : ''}`}
                    type="button"
                    aria-label={activeNote.pinned ? '取消置顶' : '置顶笔记'}
                    title={activeNote.pinned ? '取消置顶' : '置顶笔记'}
                    onClick={togglePin}
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m12 17-5 5v-8l-3-3 7-7 3 3 6-1-7 7 3 3Z" /></svg>
                  </button>
                  <button className="icon-button danger" type="button" aria-label="删除笔记" title="删除笔记" onClick={() => setDeleteOpen(true)}>
                    <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6" /></svg>
                  </button>
                </div>
              </header>

              <article className="writing-area">
                <input
                  ref={titleRef}
                  className="title-input"
                  type="text"
                  placeholder="未命名笔记"
                  aria-label="笔记标题"
                  maxLength={100}
                  value={activeNote.title}
                  onChange={event => updateActive('title', event.target.value)}
                />
                <div className="note-meta"><span>更新于 {fullDate(activeNote.updatedAt)}</span><i></i><span>{chars} 字</span></div>
                <textarea
                  id="contentInput"
                  value={activeNote.content}
                  placeholder="从这里开始写下你的想法..."
                  aria-label="笔记内容"
                  spellCheck
                  onChange={event => updateActive('content', event.target.value)}
                />
              </article>

              <footer className="editor-footer">
                <span>{chars} 字 · 预计阅读 {readingMinutes(activeNote.content)} 分钟</span>
                <span>自动保存已开启</span>
              </footer>
            </section>
          )}
        </main>
      </div>

      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">{toast}</div>

      {deleteOpen ? (
        <div className="modal-backdrop" onClick={event => {
          if (event.target === event.currentTarget) setDeleteOpen(false);
        }}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
            <div className="modal-icon">!</div>
            <h2 id="modalTitle">删除这篇笔记？</h2>
            <p>删除后将无法恢复，请确认是否继续。</p>
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setDeleteOpen(false)}>取消</button>
              <button className="delete-confirm" type="button" onClick={deleteActive}>确认删除</button>
            </div>
          </section>
        </div>
      ) : null}

      {loadError ? <div className="error-banner" role="alert">{loadError}</div> : null}
    </>
  );
}
