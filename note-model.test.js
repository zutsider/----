const test = require('node:test');
const assert = require('node:assert/strict');
const Model = require('./note-model.js');

test('createNote creates a valid independent note', () => {
  const note = Model.createNote({ title: '测试', content: '内容' });
  assert.ok(note.id.startsWith('note-'));
  assert.equal(note.title, '测试');
  assert.equal(note.pinned, false);
  assert.ok(!Number.isNaN(Date.parse(note.updatedAt)));
});

test('noteTitle falls back for blank titles', () => {
  assert.equal(Model.noteTitle({ title: '   ' }), '未命名笔记');
  assert.equal(Model.noteTitle({ title: '计划' }), '计划');
});

test('preview normalizes whitespace and truncates safely', () => {
  assert.equal(Model.preview({ content: '  第一行\n\n第二行  ' }), '第一行 第二行');
  assert.equal(Model.preview({ content: '' }), '暂无内容');
  assert.equal(Model.preview({ content: '123456' }, 4), '1234…');
});

test('character count ignores whitespace and reading time has a minimum', () => {
  assert.equal(Model.countChars('你好 world\n'), 7);
  assert.equal(Model.readingMinutes(''), 1);
  assert.equal(Model.readingMinutes('字'.repeat(401)), 2);
});

test('filterNotes searches title/content and honors pinned filter', () => {
  const notes = [
    { title: '工作', content: '会议', pinned: true },
    { title: '生活', content: '购买牛奶', pinned: false }
  ];
  assert.equal(Model.filterNotes(notes, '牛奶').length, 1);
  assert.equal(Model.filterNotes(notes, '', 'pinned').length, 1);
  assert.equal(Model.filterNotes(notes, '工作', 'pinned')[0].title, '工作');
});

test('sortNotes keeps pinned first and sorts by update time', () => {
  const notes = [
    { id: 'old', pinned: false, updatedAt: '2025-01-01' },
    { id: 'pin', pinned: true, updatedAt: '2024-01-01' },
    { id: 'new', pinned: false, updatedAt: '2026-01-01' }
  ];
  assert.deepEqual(Model.sortNotes(notes, 'desc').map(n => n.id), ['pin', 'new', 'old']);
  assert.deepEqual(Model.sortNotes(notes, 'asc').map(n => n.id), ['pin', 'old', 'new']);
});
