'use client';

import { Placeholder } from '@tiptap/extensions';
import { Fragment, Slice, type Schema } from '@tiptap/pm/model';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition, type ReactNode, type RefObject } from 'react';
import { deleteChapter, duplicateChapter, restoreRevision, saveChapter, scheduleChapter, setChapterStatus } from '@/app/admin/actions';
import {
  StoryBlockNode,
  createTemplateEditingStore,
  useEditingTemplateUid,
} from '@/components/admin/story-block/story-block-node';
import { ChangesDialog } from '@/components/admin/changes-dialog';
import { CharGoal } from '@/components/admin/char-goal';
import { FindBar, FindReplace } from '@/components/admin/find-replace';
import { SpellingCheck, SpellingPanel } from '@/components/admin/spelling-panel';
import { ShortcutGuide } from '@/components/admin/shortcut-guide';
import { TemplateMenu } from '@/components/admin/story-block/template-menu';
import { SubmitButton } from '@/components/submit-button';
import { Badge, Button, buttonClass } from '@/components/ui';
import { PrivateNote } from '@/components/admin/private-note';
import { useDismiss } from '@/components/use-dismiss';
import { formatDateTime, formatNumber, formatSchedule, formatTime } from '@/lib/format';
import { announce } from '@/lib/announce';
import { bodyStats, dialogueShare } from '@/lib/body-stats';
import { chapterFileName, chapterToText, type DocNode } from '@/lib/chapter-text';
import { compareChapter, type ChapterChanges } from '@/lib/paragraph-diff';
import { plainTextToBlocks } from '@/lib/paste';
import { punctuationEdits } from '@/lib/punctuation';
import type { RevisionItem } from '@/lib/queries/admin';
import { cn } from '@/lib/utils';

export type EditorChapter = {
  id: number;
  novelId: number;
  title: string;
  position: number;
  contentHtml: string;
  authorNote: string;
  status: 'draft' | 'published';
  updatedAt: string;
  publishedAt: string | null;
  scheduled: boolean; // 예약 발행 대기 중 (공개 시각 전이라 길드원에게 아직 안 보임)
  revisions: RevisionItem[]; // 이전 발행본 (최근 것부터)
  privateNote: string; // 작가 메모 (나만 보기, 따로 저장)
};

type SaveState = 'saved' | 'dirty' | 'saving' | 'error';
type Draft = { title: string; position: string; html: string; authorNote: string };
type LocalCopy = Draft & { at: number };

const AUTOSAVE_DELAY_MS = 2000;
const storageKeyOf = (chapterId: number) => `wn:edit:${chapterId}`;

function readLocalCopy(chapterId: number): LocalCopy | null {
  try {
    const raw = localStorage.getItem(storageKeyOf(chapterId));
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (typeof value?.html !== 'string' || typeof value?.at !== 'number') return null;
    return {
      title: String(value.title ?? ''),
      position: String(value.position ?? ''),
      html: value.html,
      authorNote: String(value.authorNote ?? ''),
      at: value.at,
    };
  } catch {
    return null;
  }
}

/** 서식 없는 글을 문단·장면 전환 노드로 바꾼 붙여넣기 조각. 처음·끝 문단은 커서가 있던 문단과 이어 붙는다 */
function plainTextSlice(text: string, schema: Schema): Slice {
  const blocks = plainTextToBlocks(text);
  if (blocks.length === 0) return Slice.empty;
  const nodes = blocks.map((block) =>
    block.kind === 'scene'
      ? schema.nodes.horizontalRule.create()
      : schema.nodes.paragraph.create(null, block.text ? schema.text(block.text) : null),
  );
  const openStart = blocks[0].kind === 'paragraph' ? 1 : 0;
  const openEnd = blocks[blocks.length - 1].kind === 'paragraph' ? 1 : 0;
  return new Slice(Fragment.from(nodes), openStart, openEnd);
}

/** 글자수 + 본문 통계(문단 · 대사 · 템플릿, lib/body-stats.ts) */
function countText(editor: Editor) {
  const text = editor.state.doc.textContent;
  return { all: [...text].length, noSpace: [...text.replace(/\s/g, '')].length, ...bodyStats(editor.state.doc) };
}

/**
 * 저장 방식
 * - 임시저장 회차: 입력이 멈추고 2초 뒤 서버에 자동저장
 * - 발행된 회차: 고치는 도중의 글이 길드원에게 보이면 안 되므로 브라우저에만 저장하고, '수정 반영'을 눌러야 서버에 올라감
 * - 두 경우 모두 서버에 반영되기 전까지는 localStorage에 사본을 둬서 창이 닫혀도 복구할 수 있다
 */
export function ChapterEditor({ chapter, novelTitle }: { chapter: EditorChapter; novelTitle: string }) {
  const storageKey = storageKeyOf(chapter.id);
  const [title, setTitle] = useState(chapter.title);
  const [position, setPosition] = useState(String(chapter.position));
  const [authorNote, setAuthorNote] = useState(chapter.authorNote);
  const [revisions, setRevisions] = useState(chapter.revisions);
  const [restorePending, startRestore] = useTransition();
  const [status, setStatus] = useState(chapter.status);
  const [publishAt, setPublishAt] = useState(chapter.publishedAt);
  const [scheduled, setScheduled] = useState(chapter.scheduled);
  // 예약 창에 띄울 기본 시각 (창이 열려 있을 때만 값이 있음)
  const [scheduleDraft, setScheduleDraft] = useState<string | null>(null);
  const scheduleButtonRef = useRef<HTMLButtonElement>(null);
  // 찾기·바꾸기 창. 열 때마다 번호를 올려서, 열린 상태에서 다시 열면(Cmd+F) 고른 글자로 새로 찾는다
  const [findSession, setFindSession] = useState(0);
  const [findOpen, setFindOpen] = useState(false);
  // 자주 틀리는 말 창 (찾기 창과 같은 자리라 한 번에 하나만)
  const [spellOpen, setSpellOpen] = useState(false);
  // 집중 모드: 이 기기에 기억해 두고, 화면 맨 처음(layout의 스크립트)에 <html data-focus>로 반영된다
  const [focusMode, setFocusMode] = useState(() => document.documentElement.dataset.focus === 'on');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [message, setMessage] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);
  const [savedAt, setSavedAt] = useState(chapter.updatedAt);
  const [counts, setCounts] = useState({ all: 0, noSpace: 0, paragraphs: 0, dialogue: 0, templates: 0 });
  // 서버에 있는 마지막 내용 (길드원에게 보이는 회차면 곧 마지막 발행본). '바뀐 곳 보기'의 비교 기준, 수정 반영·되돌리기 뒤에 바뀐다
  const [serverCopy, setServerCopy] = useState(() => ({ html: chapter.contentHtml, title: chapter.title, authorNote: chapter.authorNote }));
  const changesDialogRef = useRef<HTMLDialogElement>(null);
  const [changes, setChanges] = useState<ChapterChanges | null>(null);
  const [statusPending, startStatusTransition] = useTransition();
  // 지금 편집 중인 템플릿 (한 번에 하나만). 편집 중에는 발행·수정 반영을 막는다
  const [templateStore] = useState(createTemplateEditingStore);
  const editingTemplate = useEditingTemplateUid(templateStore) !== null;
  // 서버본보다 새 로컬 사본이 있으면 복구 배너를 띄운다 (이 컴포넌트는 브라우저에서만 그려짐)
  const [recovery, setRecovery] = useState<LocalCopy | null>(() => {
    const copy = readLocalCopy(chapter.id);
    if (!copy) return null;
    const differs =
      copy.html !== chapter.contentHtml ||
      copy.title !== chapter.title ||
      copy.position !== String(chapter.position) ||
      copy.authorNote !== chapter.authorNote;
    return differs && copy.at > Date.parse(chapter.updatedAt) ? copy : null;
  });

  const draftRef = useRef<Draft>({
    title: chapter.title,
    position: String(chapter.position),
    html: chapter.contentHtml,
    authorNote: chapter.authorNote,
  });
  // 이 에디터가 마지막으로 서버에 맞춘 회차 번호. 여기서 번호를 고쳤을 때만 번호를 보낸다
  // (목록에서 순서를 바꾼 뒤 열려 있던 에디터가 저장하면서 옛 번호로 되돌리지 않게)
  const savedPositionRef = useRef(String(chapter.position));
  const statusRef = useRef(chapter.status);
  const scheduledRef = useRef(chapter.scheduled);
  const timerRef = useRef<number | null>(null);
  // Tiptap 콜백과 타이머가 항상 최신 함수를 부르도록 ref로 잡아 둔다
  const saveRef = useRef<() => Promise<boolean>>(async () => true);
  const changeRef = useRef<() => void>(() => {});
  function toggleFocusMode() {
    const next = !focusMode;
    setFocusMode(next);
    if (next) document.documentElement.dataset.focus = 'on';
    else delete document.documentElement.dataset.focus;
    try {
      localStorage.setItem('wn:focus-mode', next ? '1' : '0');
    } catch {}
  }

  // setState 함수만 쓰므로 에디터 확장에 그대로 넘겨도 늘 같은 동작
  const openFind = () => {
    setSpellOpen(false);
    setFindOpen(true);
    setFindSession((value) => value + 1);
  };
  const toggleSpelling = () => {
    setFindOpen(false);
    setSpellOpen((open) => !open);
  };

  /** 문장 부호 다듬기: 본문 전체를 한 번에 (되돌리기 한 번이면 전부 원래대로). 템플릿 안은 그대로 (lib/punctuation.ts) */
  const polishPunctuation = () => {
    if (!editor) return;
    const edits = punctuationEdits(editor.state.doc);
    const text =
      edits.length === 0 ? '다듬을 문장 부호가 없어요' : `문장 부호 ${edits.length}곳을 다듬었어요. 되돌리려면 되돌리기(⌘Z / Ctrl+Z)`;
    if (edits.length > 0) {
      const tr = editor.state.tr;
      for (const edit of [...edits].reverse()) tr.insertText(edit.text, edit.from, edit.to);
      editor.view.dispatch(tr);
    }
    setMessage({ tone: 'info', text });
    announce(text);
  };

  /** '바뀐 곳 보기': 마지막 발행본(서버 내용)과 지금 에디터 내용을 문단 단위로 비교해서 창을 연다 (lib/paragraph-diff.ts) */
  const showChanges = () => {
    if (!editor) return;
    setChanges(compareChapter(serverCopy, { doc: editor.getJSON() as DocNode, title, authorNote }));
    changesDialogRef.current?.showModal();
  };

  /** 이 회차를 .txt로 내려받기: 지금 에디터 내용 그대로라 저장 안 한 수정도 들어간다 (글로 푸는 규칙은 lib/chapter-text.ts) */
  const exportText = () => {
    if (!editor) return;
    const fileName = chapterFileName(novelTitle, position, title);
    const text = chapterToText({ novelTitle, position, title, doc: editor.getJSON() as DocNode, authorNote });
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    const done = `‘${fileName}’ 파일로 내려받았어요`;
    setMessage({ tone: 'info', text: done });
    announce(done);
  };

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  /** 길드원에게 이미 보이는 회차인지 (발행됐고 예약 시각도 지남). 보이는 회차는 서버에 자동저장하지 않는다 */
  function isLiveNow() {
    return statusRef.current === 'published' && !scheduledRef.current;
  }

  function scheduleAutosave() {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void saveRef.current();
    }, AUTOSAVE_DELAY_MS);
  }

  async function save(): Promise<boolean> {
    clearTimer();
    // 발행된 회차의 저장은 곧 길드원에게 반영이라, 템플릿을 고치는 중에는 막는다
    if (isLiveNow() && templateStore.get() !== null) {
      setMessage({ tone: 'error', text: '편집 중인 템플릿을 완료해야 수정을 반영할 수 있어요' });
      return false;
    }
    const snapshot = { ...draftRef.current };
    const positionNumber = Number(snapshot.position);
    if (!Number.isInteger(positionNumber) || positionNumber < 1) {
      setSaveState('error');
      setMessage({ tone: 'error', text: '회차 번호를 1 이상의 숫자로 입력해 주세요' });
      return false;
    }

    const positionChanged = snapshot.position !== savedPositionRef.current;

    setSaveState('saving');
    try {
      const result = await saveChapter({
        id: chapter.id,
        title: snapshot.title,
        ...(positionChanged ? { position: positionNumber } : {}),
        contentHtml: snapshot.html,
        authorNote: snapshot.authorNote,
      });
      if (!result.ok) {
        setSaveState('error');
        setMessage({ tone: 'error', text: result.message });
        return false;
      }
      if (positionChanged) savedPositionRef.current = snapshot.position;
      setServerCopy({ html: snapshot.html, title: snapshot.title, authorNote: snapshot.authorNote });
      setSavedAt(result.savedAt);
      setMessage((current) => (current?.tone === 'error' ? null : current));
      const latest = draftRef.current;
      const unchanged =
        latest.html === snapshot.html &&
        latest.title === snapshot.title &&
        latest.position === snapshot.position &&
        latest.authorNote === snapshot.authorNote;
      if (unchanged) {
        setSaveState('saved');
        try {
          localStorage.removeItem(storageKey);
        } catch {}
      } else {
        // 저장하는 사이에 더 고쳤으면 이어서 저장
        setSaveState('dirty');
        if (!isLiveNow()) scheduleAutosave();
      }
      return true;
    } catch {
      setSaveState('error');
      setMessage({ tone: 'error', text: '저장하지 못했어요. 인터넷 연결을 확인해 주세요' });
      return false;
    }
  }

  function handleChange() {
    setSaveState('dirty');
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...draftRef.current, at: Date.now() }));
    } catch {}
    if (!isLiveNow()) scheduleAutosave();
  }

  useEffect(() => {
    saveRef.current = save;
    changeRef.current = handleChange;
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        code: false,
        codeBlock: false,
        link: false,
        underline: false,
      }),
      Placeholder.configure({ placeholder: '여기에 본문을 써 주세요' }),
      StoryBlockNode.configure({ editingStore: templateStore }),
      FindReplace.configure({ onOpen: openFind }),
      SpellingCheck,
    ],
    content: chapter.contentHtml,
    editorProps: {
      attributes: {
        class: 'novel-body min-h-[55vh] px-5 py-7 sm:px-9 sm:py-9',
        spellcheck: 'false',
        'aria-label': '본문',
      },
      // 메모장·한글·카톡 등에서 붙여 넣은 '서식 없는 글': 줄마다 문단, 빈 줄 간격·장면 전환 기호 정리 (lib/paste.ts)
      clipboardTextParser: (text, _context, _plain, view) => plainTextSlice(text, view.state.schema),
    },
    onCreate: ({ editor: created }) => setCounts(countText(created)),
    onUpdate: ({ editor: updated }) => {
      draftRef.current.html = updated.getHTML();
      setCounts(countText(updated));
      changeRef.current();
    },
  });

  // 다른 화면으로 이동하거나 닫힐 때, 예약된 자동저장이 있으면 바로 저장
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
        void saveRef.current();
      }
    };
  }, []);

  // 서버에 반영 안 된 수정이 있으면 창 닫기 전에 경고
  useEffect(() => {
    if (saveState === 'saved') return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveState]);

  // 화면을 열어 둔 채 예약 시각이 지나면 '발행됨'으로 바꾼다 (그 뒤로는 수정 반영을 눌러야 길드원에게 보임)
  useEffect(() => {
    if (!scheduled || !publishAt) return;
    const delay = Date.parse(publishAt) - Date.now();
    if (delay > 2_000_000_000) return; // setTimeout 한계(약 24일)보다 먼 예약은 화면을 다시 열 때 반영
    const timer = window.setTimeout(() => {
      scheduledRef.current = false;
      setScheduled(false);
      setMessage({ tone: 'info', text: '예약한 시각이 되어 공개됐어요. 이제부터 고친 내용은 수정 반영을 눌러야 길드원에게 보여요' });
    }, Math.max(0, delay));
    return () => window.clearTimeout(timer);
  }, [scheduled, publishAt]);

  // Cmd/Ctrl + S → 저장 (Shift가 같이 눌리면 취소선 단축키라 저장하지 않는다)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function updateTitle(value: string) {
    setTitle(value);
    draftRef.current.title = value;
    handleChange();
  }

  function updateAuthorNote(value: string) {
    setAuthorNote(value);
    draftRef.current.authorNote = value;
    handleChange();
  }

  function updatePosition(value: string) {
    const digits = value.replace(/[^0-9]/g, '').slice(0, 4);
    setPosition(digits);
    draftRef.current.position = digits;
    handleChange();
  }

  function restoreLocalCopy() {
    if (!recovery || !editor) return;
    editor.commands.setContent(recovery.html);
    draftRef.current = {
      title: recovery.title,
      position: recovery.position,
      html: editor.getHTML(),
      authorNote: recovery.authorNote,
    };
    setTitle(recovery.title);
    setPosition(recovery.position);
    setAuthorNote(recovery.authorNote);
    setCounts(countText(editor));
    setRecovery(null);
    handleChange();
  }

  /** 이전 발행본으로 되돌리기: 서버에서 바꾼 뒤 에디터 내용도 그 본문으로 바꾼다 (지금 본문은 기록에 남음) */
  function restore(revision: RevisionItem) {
    const lines = [
      `${formatDateTime(new Date(revision.createdAt))} 발행본으로 되돌릴까요?`,
      '지금 본문은 이전 발행본에 남아서 다시 되돌릴 수 있어요.',
      isLiveNow() ? '길드원에게 바로 보여요.' : '',
      saveState !== 'saved' ? '아직 저장하지 않은 수정은 사라져요.' : '',
    ];
    if (!window.confirm(lines.filter(Boolean).join('\n'))) return;
    templateStore.set(null);
    clearTimer();
    startRestore(async () => {
      const result = await restoreRevision(chapter.id, revision.id);
      if (!result.ok) {
        setMessage({ tone: 'error', text: result.message });
        return;
      }
      if (editor) {
        editor.commands.setContent(result.chapter.contentHtml, { emitUpdate: false });
        setCounts(countText(editor));
      }
      draftRef.current = {
        ...draftRef.current,
        title: result.chapter.title,
        html: editor ? editor.getHTML() : result.chapter.contentHtml,
        authorNote: result.chapter.authorNote,
      };
      setServerCopy({ html: result.chapter.contentHtml, title: result.chapter.title, authorNote: result.chapter.authorNote });
      setTitle(result.chapter.title);
      setAuthorNote(result.chapter.authorNote);
      setSavedAt(result.chapter.updatedAt);
      setSaveState('saved');
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      setRevisions(result.revisions);
      setMessage({ tone: 'info', text: '이전 발행본으로 되돌렸어요. 되돌리기 전 본문은 기록에 남았어요' });
    });
  }

  function discardLocalCopy() {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setRecovery(null);
  }

  function changeStatus(next: 'draft' | 'published') {
    if (next === 'published' && templateStore.get() !== null) {
      setMessage({ tone: 'error', text: '편집 중인 템플릿을 완료해야 발행할 수 있어요' });
      return;
    }
    startStatusTransition(async () => {
      // 발행 전에 지금 내용을 먼저 저장
      if (next === 'published' && saveState !== 'saved' && !(await save())) return;
      const result = await setChapterStatus(chapter.id, next);
      if (!result.ok) {
        setMessage({ tone: 'error', text: result.message });
        return;
      }
      const wasScheduled = scheduledRef.current;
      statusRef.current = result.status;
      scheduledRef.current = false;
      setStatus(result.status);
      setScheduled(false);
      setPublishAt(result.publishedAt);
      setMessage({
        tone: 'info',
        text:
          result.status === 'published'
            ? '발행했어요. 이제 길드원이 볼 수 있어요'
            : wasScheduled
              ? '예약을 취소했어요. 임시저장 상태로 돌아왔어요'
              : '임시저장으로 돌렸어요. 길드원에게는 안 보여요',
      });
    });
  }

  function openSchedule() {
    if (templateStore.get() !== null) {
      setMessage({ tone: 'error', text: '편집 중인 템플릿을 완료해야 예약할 수 있어요' });
      return;
    }
    setScheduleDraft(toLocalInputValue(scheduled && publishAt ? new Date(publishAt) : nextScheduleDefault()));
  }

  function schedule(localValue: string) {
    if (templateStore.get() !== null) {
      setMessage({ tone: 'error', text: '편집 중인 템플릿을 완료해야 예약할 수 있어요' });
      return;
    }
    // datetime-local 값은 브라우저 시간대(한국)로 해석된다
    const when = new Date(localValue);
    if (Number.isNaN(when.getTime())) {
      setMessage({ tone: 'error', text: '예약 시각을 다시 골라 주세요' });
      return;
    }
    startStatusTransition(async () => {
      // 예약 전에 지금 내용을 먼저 저장
      if (saveState !== 'saved' && !(await save())) return;
      const result = await scheduleChapter(chapter.id, when.toISOString());
      if (!result.ok) {
        setMessage({ tone: 'error', text: result.message });
        return;
      }
      statusRef.current = 'published';
      scheduledRef.current = true;
      setStatus('published');
      setScheduled(true);
      setPublishAt(result.publishedAt);
      setScheduleDraft(null);
      scheduleButtonRef.current?.focus(); // 예약 창이 닫혀도 키보드 위치는 '예약 변경' 버튼에
      setMessage({
        tone: 'info',
        text: `${result.publishedAt ? formatSchedule(new Date(result.publishedAt)) : '예약한 시각'}에 공개돼요. 그 전까지는 지금처럼 자동저장돼요`,
      });
    });
  }

  const live = status === 'published' && !scheduled;

  const saveLabel: Record<SaveState, string> = {
    saved: `저장됨 · ${formatTime(new Date(savedAt))}`,
    dirty: live ? '반영 안 된 수정이 있어요' : '입력 중…',
    saving: '저장하는 중…',
    error: '저장 실패',
  };

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link href={`/admin/novels/${chapter.novelId}`} className="max-w-full truncate text-sm font-semibold text-muted hover:text-fg">
          ← {novelTitle}
        </Link>
        <Badge tone={live ? 'accent' : scheduled ? 'neutral' : 'muted'}>
          {live ? '발행됨' : scheduled && publishAt ? `예약 · ${formatSchedule(new Date(publishAt))}` : '임시저장'}
        </Badge>
        <span
          aria-live="polite"
          className={cn('text-[13px] tabular-nums', saveState === 'error' ? 'text-danger' : 'text-muted')}
        >
          {saveLabel[saveState]}
        </span>
      </div>

      {recovery ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent-soft px-4 py-3">
          <p className="text-sm">
            서버에 저장 안 된 수정본이 있어요 <span className="text-muted">({formatTime(new Date(recovery.at))})</span>
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={restoreLocalCopy}>
              복구하기
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={discardLocalCopy}>
              버리기
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex items-end gap-3">
        <label className="w-[5.5rem] shrink-0">
          <span className="mb-1 block text-xs font-semibold text-muted">회차</span>
          <span className="flex items-center gap-1.5">
            <input
              value={position}
              onChange={(event) => updatePosition(event.target.value)}
              inputMode="numeric"
              aria-label="회차 번호"
              className="h-11 w-full rounded-xl border border-line bg-surface px-2 text-center text-base font-semibold tabular-nums focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none"
            />
            <span className="text-sm text-muted">화</span>
          </span>
        </label>
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-xs font-semibold text-muted">제목</span>
          <input
            value={title}
            onChange={(event) => updateTitle(event.target.value)}
            maxLength={100}
            placeholder="회차 제목 (비워도 돼요)"
            className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-lg font-bold placeholder:font-normal placeholder:text-muted/70 focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none"
          />
        </label>
      </div>

      <div className="sticky top-0 z-20 -mx-1 mt-5 bg-bg/90 px-1 py-2 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {editor ? (
            <Toolbar
              editor={editor}
              onFind={openFind}
              onPolish={polishPunctuation}
              spellOpen={spellOpen}
              onSpelling={toggleSpelling}
              focusMode={focusMode}
              onToggleFocus={toggleFocusMode}
            />
          ) : (
            <div className="h-10" />
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {editingTemplate ? (
              // 편집 중에는 발행이 막힌다는 걸 알려 주고, 여기서 바로 편집을 마칠 수 있게
              <span className="flex items-center gap-1 text-xs text-muted">
                <span className="hidden sm:inline">템플릿 편집 중이라 {live ? '반영' : '발행'}할 수 없어요</span>
                <button
                  type="button"
                  onClick={() => templateStore.set(null)}
                  className="h-8 rounded-lg px-2 font-semibold text-accent transition hover:bg-accent-soft"
                >
                  템플릿 편집 마치기
                </button>
              </span>
            ) : null}
            {!live ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void save()}
                  disabled={saveState === 'saved' || saveState === 'saving'}
                >
                  저장
                </Button>
                <div className="relative">
                  <Button
                    ref={scheduleButtonRef}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={openSchedule}
                    disabled={statusPending || editingTemplate}
                    aria-expanded={scheduleDraft !== null}
                  >
                    {scheduled ? '예약 변경' : '예약'}
                  </Button>
                  {scheduleDraft !== null ? (
                    <SchedulePopover
                      defaultValue={scheduleDraft}
                      pending={statusPending}
                      onConfirm={schedule}
                      onClose={() => setScheduleDraft(null)}
                      triggerRef={scheduleButtonRef}
                    />
                  ) : null}
                </div>
                {scheduled ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => changeStatus('draft')} disabled={statusPending}>
                    예약 취소
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => changeStatus('published')}
                  disabled={statusPending || editingTemplate}
                  title={editingTemplate ? '편집 중인 템플릿을 완료해야 발행할 수 있어요' : undefined}
                >
                  {scheduled ? '지금 발행' : '발행하기'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => changeStatus('draft')}
                  disabled={statusPending}
                >
                  발행 취소
                </Button>
                {/* 반영 전에 길드원에게 어떻게 바뀌어 보일지 (고친 게 있을 때만) */}
                {saveState !== 'saved' ? (
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={showChanges}
                    className={buttonClass('secondary', 'sm')}
                  >
                    바뀐 곳 보기
                  </button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void save()}
                  disabled={saveState === 'saved' || saveState === 'saving' || editingTemplate}
                  title={editingTemplate ? '편집 중인 템플릿을 완료해야 반영할 수 있어요' : undefined}
                >
                  수정 반영
                </Button>
              </>
            )}
          </div>
        </div>
        {findOpen && editor ? <FindBar key={findSession} editor={editor} onClose={() => setFindOpen(false)} /> : null}
        {spellOpen && editor ? <SpellingPanel editor={editor} onClose={() => setSpellOpen(false)} /> : null}
      </div>

      <EditorContent editor={editor} className="mt-2 rounded-2xl border border-line bg-surface" />
      <ChangesDialog result={changes} dialogRef={changesDialogRef} />

      <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
        {message ? (
          <p role="status" className={cn('text-sm font-medium', message.tone === 'error' ? 'text-danger' : 'text-accent')}>
            {message.text}
          </p>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
          <p className="text-[13px] text-muted tabular-nums">
            공백 포함 {formatNumber(counts.all)}자 · 공백 제외 {formatNumber(counts.noSpace)}자
          </p>
          {/* 본문 통계: 대사는 따옴표로 시작하는 문단 (빈 문단·템플릿 안의 글은 안 셈) */}
          {counts.paragraphs > 0 || counts.templates > 0 ? (
            <p className="text-[13px] text-muted tabular-nums">
              문단 {formatNumber(counts.paragraphs)} · 대사 {formatNumber(counts.dialogue)} ({dialogueShare(counts)}%)
              {counts.templates > 0 ? ` · 템플릿 ${formatNumber(counts.templates)}` : ''}
            </p>
          ) : null}
          {/* 목표는 공백 포함 글자수 기준 */}
          <CharGoal count={counts.all} />
        </div>
      </div>

      {/* 회차 끝 '작가의 말': 본문과 같은 저장 흐름(자동저장·수정 반영·로컬 사본)을 탄다 */}
      <div className="mt-8 space-y-1.5">
        <label htmlFor="author-note" className="block text-sm font-semibold">
          작가의 말 <span className="font-normal text-muted">(선택)</span>
        </label>
        <p id="author-note-hint" className="text-xs text-muted">
          회차 맨 아래에 상자로 보여요. 비워 두면 안 보여요. 글자수에는 들어가지 않아요.
        </p>
        <textarea
          id="author-note"
          aria-describedby="author-note-hint"
          value={authorNote}
          onChange={(event) => updateAuthorNote(event.target.value)}
          maxLength={2000}
          placeholder="이번 화 뒷이야기, 다음 화 예고, 감사 인사 같은 것"
          className="min-h-24 w-full resize-y rounded-2xl border border-line bg-surface px-4 py-3 text-base leading-relaxed field-sizing-content placeholder:text-muted/70 focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none"
        />
      </div>

      {/* 작가 메모: 본문과 따로 저장되고 길드원에게는 절대 안 보인다 */}
      <PrivateNote chapterId={chapter.id} initial={chapter.privateNote} />

      {/* 이전 발행본: 발행된 회차를 '수정 반영'할 때마다 바뀌기 전 본문이 쌓인다 (최근 10개) */}
      {revisions.length > 0 ? (
        <details className="group mt-8 rounded-2xl border border-line bg-surface px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold">
            이전 발행본 <span className="text-muted">{revisions.length}</span>
          </summary>
          <div className="mt-1 text-xs text-muted">수정 반영할 때마다 바뀌기 전 본문을 최근 10개까지 남겨요. 되돌려도 지금 본문은 기록에 남아요.</div>
          <ul className="mt-2 divide-y divide-line" aria-busy={restorePending}>
            {revisions.map((revision) => (
              <li key={revision.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block text-sm tabular-nums">
                    {formatDateTime(new Date(revision.createdAt))} · {formatNumber(revision.charCount)}자
                  </span>
                  <span className="block truncate text-xs text-muted">{revision.excerpt || '(빈 본문)'}</span>
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => restore(revision)}
                  disabled={restorePending}
                  aria-label={`${formatDateTime(new Date(revision.createdAt))} 발행본으로 되돌리기`}
                >
                  되돌리기
                </Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div data-focus-hide="" className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/novels/${chapter.novelId}/${chapter.id}`}
            target="_blank"
            rel="noreferrer"
            className={buttonClass('secondary', 'sm')}
          >
            열람 화면으로 미리보기 ↗
          </a>
          {/* 복제: 서버에 저장된 내용으로 새 임시저장 회차를 만든다 */}
          <form
            action={duplicateChapter.bind(null, chapter.novelId, chapter.id)}
            onSubmit={(event) => {
              const question =
                saveState === 'saved'
                  ? '이 회차를 복제해서 새 임시저장 회차를 만들까요? 목록 맨 뒤에 생겨요.'
                  : '아직 저장하지 않은 수정은 복제되지 않아요. 마지막으로 저장된 내용으로 새 회차를 만들까요?';
              if (!window.confirm(question)) event.preventDefault();
            }}
          >
            <SubmitButton variant="secondary" size="sm" pendingText="복제하는 중…">
              복제해서 새 회차로
            </SubmitButton>
          </form>
          {/* 다른 곳에 옮겨 적거나 따로 보관할 때: 템플릿도 글로 풀어서 .txt 한 파일로 */}
          <button type="button" onClick={exportText} className={buttonClass('secondary', 'sm')}>
            텍스트 파일로 저장
          </button>
        </div>
        <form
          action={deleteChapter.bind(null, chapter.novelId, chapter.id)}
          onSubmit={(event) => {
            if (!window.confirm('이 회차를 삭제할까요? 좋아요·열람 기록도 함께 지워지고 되돌릴 수 없어요.')) {
              event.preventDefault();
              return;
            }
            clearTimer();
            try {
              localStorage.removeItem(storageKey);
            } catch {}
          }}
        >
          <SubmitButton variant="danger" size="sm" pendingText="삭제하는 중…">
            회차 삭제
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

/** <input type="datetime-local">에 넣을 값 (브라우저 시간대 기준) */
function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 예약 기본값: 두 시간 뒤 정각 (예: 18:20 → 20:00) */
function nextScheduleDefault(): Date {
  const date = new Date();
  date.setHours(date.getHours() + 2, 0, 0, 0);
  return date;
}

function SchedulePopover({
  defaultValue,
  pending,
  onConfirm,
  onClose,
  triggerRef,
}: {
  defaultValue: string;
  pending: boolean;
  onConfirm: (value: string) => void;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const [value, setValue] = useState(defaultValue);
  const rootRef = useRef<HTMLDivElement>(null);

  // 바깥을 누르거나 Esc를 누르면 닫기 (Esc면 '예약' 버튼으로 포커스를 돌려준다)
  useDismiss({ open: true, onClose, rootRef, triggerRef });

  function cancel() {
    onClose();
    triggerRef.current?.focus();
  }

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label="예약 발행"
      className="absolute top-10 right-0 z-30 w-72 rounded-2xl border border-line bg-surface p-4 text-left shadow-lg shadow-black/10"
    >
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold">공개할 시각</span>
        <input
          type="datetime-local"
          value={value}
          // 열리면 바로 시각을 고를 수 있게 (키보드로 연 경우 포커스가 창 안으로 들어옴)
          autoFocus
          onChange={(event) => setValue(event.target.value)}
          className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-fg focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none"
        />
      </label>
      <p className="mt-2 text-xs leading-relaxed text-muted">이 시각이 되면 길드원에게 보여요. 그 전까지는 임시저장처럼 자동저장돼요.</p>
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={cancel}>
          취소
        </Button>
        <Button type="button" size="sm" disabled={!value || pending} onClick={() => onConfirm(value)}>
          예약하기
        </Button>
      </div>
    </div>
  );
}

function Toolbar({
  editor,
  onFind,
  onPolish,
  spellOpen,
  onSpelling,
  focusMode,
  onToggleFocus,
}: {
  editor: Editor;
  onFind: () => void;
  onPolish: () => void;
  spellOpen: boolean;
  onSpelling: () => void;
  focusMode: boolean;
  onToggleFocus: () => void;
}) {
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      strike: current.isActive('strike'),
      quote: current.isActive('blockquote'),
      // 되돌릴 것·다시 할 것이 있는지 (템플릿 안 글자 고침은 문서 기록에 넣지 않으므로 여기에 안 잡힘)
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    }),
  });

  const items: Array<{ key: string; label: string; icon: ReactNode; active?: boolean; run: () => void }> = [
    { key: 'bold', label: '굵게', icon: <b>B</b>, active: active?.bold, run: () => editor.chain().focus().toggleBold().run() },
    { key: 'italic', label: '기울임', icon: <i className="font-serif">I</i>, active: active?.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { key: 'strike', label: '취소선', icon: <s>S</s>, active: active?.strike, run: () => editor.chain().focus().toggleStrike().run() },
    { key: 'scene', label: '장면 전환', icon: <span className="text-xs">✦</span>, run: () => editor.chain().focus().setHorizontalRule().run() },
    { key: 'quote', label: '인용', icon: <span className="text-lg leading-none">❝</span>, active: active?.quote, run: () => editor.chain().focus().toggleBlockquote().run() },
  ];

  return (
    // 휴대폰 폭에서 단추가 넘치면 두 줄로 (가로로 삐져나가지 않게)
    <div role="toolbar" aria-label="서식" className="flex flex-wrap items-center gap-0.5 rounded-xl border border-line bg-surface p-1">
      <TemplateMenu editor={editor} />
      <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-line" />
      {/* 되돌리기·다시 하기: 휴대폰처럼 단축키를 못 쓰는 곳에서도 */}
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!active?.canUndo}
        title="되돌리기 (Ctrl+Z / ⌘Z)"
        aria-label="되돌리기"
        className="grid h-8 min-w-8 place-items-center rounded-lg px-2 text-fg transition hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-35"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!active?.canRedo}
        title="다시 하기 (Ctrl+Shift+Z / ⇧⌘Z)"
        aria-label="다시 하기"
        className="grid h-8 min-w-8 place-items-center rounded-lg px-2 text-fg transition hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-35"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
          <path d="m15 14 5-5-5-5" />
          <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
        </svg>
      </button>
      <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-line" />
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          title={item.label}
          aria-label={item.label}
          aria-pressed={item.active ?? undefined}
          onClick={item.run}
          className={cn(
            'grid h-8 min-w-8 place-items-center rounded-lg px-2 text-sm transition',
            item.active ? 'bg-accent-soft text-accent' : 'text-fg hover:bg-surface-2',
          )}
        >
          {item.icon}
        </button>
      ))}
      <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-line" />
      <button
        type="button"
        onClick={onFind}
        title="찾기·바꾸기 (Ctrl+F / ⌘F)"
        aria-label="찾기·바꾸기"
        className="grid h-8 min-w-8 place-items-center rounded-lg px-2 text-fg transition hover:bg-surface-2"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="size-4">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onPolish}
        title={'문장 부호 다듬기: ... → …, " " → “ ”, \' \' → ‘ ’ (템플릿 안은 그대로)'}
        aria-label="문장 부호 다듬기"
        className="grid h-8 min-w-8 place-items-center rounded-lg px-2 text-[13px] font-semibold text-fg transition hover:bg-surface-2"
      >
        <span aria-hidden="true">“…”</span>
      </button>
      <button
        type="button"
        onClick={onSpelling}
        aria-expanded={spellOpen}
        title="자주 틀리는 말 찾기: 됬 → 됐, 몇일 → 며칠, 할께 → 할게 … (템플릿 안은 그대로)"
        aria-label="자주 틀리는 말 찾기"
        className={cn('grid h-8 min-w-8 place-items-center rounded-lg px-2 transition', spellOpen ? 'bg-accent-soft text-accent' : 'text-fg hover:bg-surface-2')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
          <path d="M5 9.5l3.5 3.5L16 5.5" />
          <path d="M3 19c1.5-1.6 3-1.6 4.5 0s3 1.6 4.5 0 3-1.6 4.5 0 3 1.6 4.5 0" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onToggleFocus}
        aria-pressed={focusMode}
        title={focusMode ? '집중 모드 끝내기' : '집중 모드 (메뉴·옆 칸 숨기기)'}
        aria-label="집중 모드"
        className={cn(
          'grid h-8 min-w-8 place-items-center rounded-lg px-2 transition',
          focusMode ? 'bg-accent-soft text-accent' : 'text-fg hover:bg-surface-2',
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
          {focusMode ? (
            <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
          ) : (
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          )}
        </svg>
      </button>
      <ShortcutGuide />
    </div>
  );
}
