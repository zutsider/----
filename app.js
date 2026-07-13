(() => {
  'use strict';
  const Model = window.NoteModel;
  const STORAGE_KEY = '292-notes-v1';
  const LEGACY_STORAGE_KEY = 'mark-notes-v1';
  const THEME_KEY = '292-notes-theme';
  const LEGACY_THEME_KEY = 'mark-notes-theme';

  const $ = id => document.getElementById(id);
  const els = {
    notesList: $('notesList'), newNoteButton: $('newNoteButton'), emptyNewButton: $('emptyNewButton'),
    searchInput: $('searchInput'), titleInput: $('titleInput'), contentInput: $('contentInput'),
    breadcrumbTitle: $('breadcrumbTitle'), dateLabel: $('dateLabel'), wordCount: $('wordCount'),
    footerStats: $('footerStats'), allCount: $('allCount'), pinnedCount: $('pinnedCount'),
    editorPanel: $('editorPanel'), emptyState: $('emptyState'), pinButton: $('pinButton'),
    deleteButton: $('deleteButton'), deleteModal: $('deleteModal'), cancelDelete: $('cancelDelete'),
    confirmDelete: $('confirmDelete'), saveState: $('saveState'), storageStatus: $('storageStatus'),
    themeButton: $('themeButton'), toast: $('toast'), sortButton: $('sortButton'), listTitle: $('listTitle'),
    openSidebar: $('openSidebar'), closeSidebar: $('closeSidebar')
  };

  const sampleNotes = [
    Model.createNote({ id: 'welcome', title: '欢迎使用292笔记', content: '这是一个简洁、专注的笔记空间。\n\n你可以在左侧创建和搜索笔记，编辑内容会自动保存在当前浏览器中。点击工具栏上的图钉，还可以把重要笔记置顶。', pinned: true, createdAt: '2026-07-11T08:00:00.000Z', updatedAt: '2026-07-11T08:00:00.000Z' }),
    Model.createNote({ id: 'ideas', title: '灵感收集箱', content: '随手记录突然出现的想法：\n\n• 周末整理书架\n• 尝试一个新的个人项目\n• 给很久没联系的朋友写封信', createdAt: '2026-07-10T10:30:00.000Z', updatedAt: '2026-07-10T10:30:00.000Z' }),
    Model.createNote({ id: 'reading', title: '七月阅读清单', content: '这个月想读完三本书，并为每本书写一页阅读笔记。保持轻松，不追求速度。', createdAt: '2026-07-08T12:00:00.000Z', updatedAt: '2026-07-08T12:00:00.000Z' })
  ];

  let state = { notes: loadNotes(), activeId: null, filter: 'all', query: '', sort: 'desc' };
  let saveTimer = null;
  let toastTimer = null;
  state.activeId = state.notes[0]?.id || null;

  function loadNotes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
      const saved = JSON.parse(raw);
      return Array.isArray(saved) ? saved.map(note => note.id === 'welcome' && note.title === '欢迎使用马克笔记' ? { ...note, title: '欢迎使用292笔记' } : note) : sampleNotes;
    } catch { return sampleNotes; }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notes));
      els.saveState.classList.remove('saving');
      els.saveState.innerHTML = '<i></i>已保存';
      els.storageStatus.textContent = '已保存到本地';
    } catch {
      els.storageStatus.textContent = '保存失败';
      showToast('浏览器存储空间不足');
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    els.saveState.classList.add('saving');
    els.saveState.innerHTML = '<i></i>保存中...';
    saveTimer = setTimeout(persist, 350);
  }

  function activeNote() { return state.notes.find(note => note.id === state.activeId); }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);
  }

  function relativeDate(iso) {
    const date = new Date(iso);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const days = Math.round((start - target) / 86400000);
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days > 1 && days < 7) return `${days} 天前`;
    return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(date);
  }

  function fullDate(iso) {
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  }

  function renderList() {
    const visible = Model.sortNotes(Model.filterNotes(state.notes, state.query, state.filter), state.sort);
    els.allCount.textContent = state.notes.length;
    els.pinnedCount.textContent = state.notes.filter(n => n.pinned).length;
    els.listTitle.textContent = state.query ? '搜索结果' : (state.filter === 'pinned' ? '置顶笔记' : '最近笔记');
    if (!visible.length) {
      els.notesList.innerHTML = `<div class="no-results">${state.query ? '没有找到匹配的笔记' : '这里还没有笔记'}</div>`;
      return;
    }
    els.notesList.innerHTML = visible.map(note => `
      <button class="note-card ${note.id === state.activeId ? 'active' : ''}" data-id="${escapeHtml(note.id)}" role="listitem" type="button">
        <div class="note-card-title">${note.pinned ? '<span class="pin" aria-label="已置顶">●</span>' : ''}${escapeHtml(Model.noteTitle(note))}</div>
        <p class="note-card-preview">${escapeHtml(Model.preview(note))}</p>
        <div class="note-card-meta"><span>${relativeDate(note.updatedAt)}</span><i></i><span>${Model.countChars(note.content)} 字</span></div>
      </button>`).join('');
  }

  function renderEditor() {
    const note = activeNote();
    els.editorPanel.hidden = !note;
    els.emptyState.hidden = Boolean(note);
    if (!note) return;
    els.titleInput.value = note.title;
    els.contentInput.value = note.content;
    els.breadcrumbTitle.textContent = Model.noteTitle(note);
    els.dateLabel.textContent = `更新于 ${fullDate(note.updatedAt)}`;
    const chars = Model.countChars(note.content);
    els.wordCount.textContent = `${chars} 字`;
    els.footerStats.textContent = `${chars} 字 · 预计阅读 ${Model.readingMinutes(note.content)} 分钟`;
    els.pinButton.classList.toggle('active', note.pinned);
    els.pinButton.setAttribute('aria-label', note.pinned ? '取消置顶' : '置顶笔记');
  }

  function render() { renderList(); renderEditor(); }

  function createNewNote() {
    const note = Model.createNote();
    state.notes.unshift(note);
    state.activeId = note.id;
    state.filter = 'all';
    state.query = '';
    els.searchInput.value = '';
    document.querySelectorAll('.filter-button').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === 'all'));
    persist();
    render();
    els.titleInput.focus();
    document.body.classList.remove('sidebar-open');
    showToast('已创建新笔记');
  }

  function updateActive(field, value) {
    const note = activeNote();
    if (!note) return;
    note[field] = value;
    note.updatedAt = new Date().toISOString();
    els.breadcrumbTitle.textContent = Model.noteTitle(note);
    els.dateLabel.textContent = `更新于 ${fullDate(note.updatedAt)}`;
    const chars = Model.countChars(note.content);
    els.wordCount.textContent = `${chars} 字`;
    els.footerStats.textContent = `${chars} 字 · 预计阅读 ${Model.readingMinutes(note.content)} 分钟`;
    renderList();
    scheduleSave();
  }

  function deleteActive() {
    const index = state.notes.findIndex(n => n.id === state.activeId);
    if (index < 0) return;
    state.notes.splice(index, 1);
    state.activeId = state.notes[Math.min(index, state.notes.length - 1)]?.id || null;
    els.deleteModal.hidden = true;
    persist();
    render();
    showToast('笔记已删除');
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add('show');
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1800);
  }

  els.notesList.addEventListener('click', event => {
    const card = event.target.closest('.note-card');
    if (!card) return;
    state.activeId = card.dataset.id;
    render();
    document.body.classList.remove('sidebar-open');
  });
  els.newNoteButton.addEventListener('click', createNewNote);
  els.emptyNewButton.addEventListener('click', createNewNote);
  els.titleInput.addEventListener('input', e => updateActive('title', e.target.value));
  els.contentInput.addEventListener('input', e => updateActive('content', e.target.value));
  els.searchInput.addEventListener('input', e => { state.query = e.target.value; renderList(); });
  document.querySelectorAll('.filter-button').forEach(button => button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    document.querySelectorAll('.filter-button').forEach(btn => btn.classList.toggle('active', btn === button));
    renderList();
  }));
  els.pinButton.addEventListener('click', () => {
    const note = activeNote(); if (!note) return;
    note.pinned = !note.pinned; note.updatedAt = new Date().toISOString(); persist(); render();
    showToast(note.pinned ? '笔记已置顶' : '已取消置顶');
  });
  els.deleteButton.addEventListener('click', () => { els.deleteModal.hidden = false; els.cancelDelete.focus(); });
  els.cancelDelete.addEventListener('click', () => { els.deleteModal.hidden = true; });
  els.confirmDelete.addEventListener('click', deleteActive);
  els.deleteModal.addEventListener('click', e => { if (e.target === els.deleteModal) els.deleteModal.hidden = true; });
  els.sortButton.addEventListener('click', () => {
    state.sort = state.sort === 'desc' ? 'asc' : 'desc';
    els.sortButton.textContent = state.sort === 'desc' ? '最新修改 ↓' : '最早修改 ↑';
    els.sortButton.setAttribute('aria-label', `当前按${state.sort === 'desc' ? '最新' : '最早'}修改排序`);
    renderList();
  });
  els.themeButton.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
    showToast(next === 'dark' ? '已切换至深色模式' : '已切换至浅色模式');
  });
  els.openSidebar.addEventListener('click', () => document.body.classList.add('sidebar-open'));
  els.closeSidebar.addEventListener('click', () => document.body.classList.remove('sidebar-open'));
  document.addEventListener('keydown', event => {
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === 'k') { event.preventDefault(); els.searchInput.focus(); }
    if (mod && event.key.toLowerCase() === 'n') { event.preventDefault(); createNewNote(); }
    if (event.key === 'Escape') { els.deleteModal.hidden = true; document.body.classList.remove('sidebar-open'); }
  });

  const savedTheme = localStorage.getItem(THEME_KEY) ?? localStorage.getItem(LEGACY_THEME_KEY);
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  render();
})();


