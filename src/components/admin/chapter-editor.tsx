'use client';

import { Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { deleteChapter, saveChapter, setChapterStatus } from '@/app/admin/actions';
import { SubmitButton } from '@/components/submit-button';
import { Badge, Button, buttonClass } from '@/components/ui';
import { formatNumber, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export type EditorChapter = {
  id: number;
  novelId: number;
  title: string;
  position: number;
  contentHtml: string;
  status: 'draft' | 'published';
  updatedAt: string;
};

type SaveState = 'saved' | 'dirty' | 'saving' | 'error';
type Draft = { title: string; position: string; html: string };
type LocalCopy = Draft & { at: number };

const AUTOSAVE_DELAY_MS = 2000;
const storageKeyOf = (chapterId: number) => `wn:edit:${chapterId}`;

function readLocalCopy(chapterId: number): LocalCopy | null {
  try {
    const raw = localStorage.getItem(storageKeyOf(chapterId));
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (typeof value?.html !== 'string' || typeof value?.at !== 'number') return null;
    return { title: String(value.title ?? ''), position: String(value.position ?? ''), html: value.html, at: value.at };
  } catch {
    return null;
  }
}

function countText(editor: Editor) {
  const text = editor.state.doc.textContent;
  return { all: [...text].length, noSpace: [...text.replace(/\s/g, '')].length };
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
  const [status, setStatus] = useState(chapter.status);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [message, setMessage] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);
  const [savedAt, setSavedAt] = useState(chapter.updatedAt);
  const [counts, setCounts] = useState({ all: 0, noSpace: 0 });
  const [statusPending, startStatusTransition] = useTransition();
  // 서버본보다 새 로컬 사본이 있으면 복구 배너를 띄운다 (이 컴포넌트는 브라우저에서만 그려짐)
  const [recovery, setRecovery] = useState<LocalCopy | null>(() => {
    const copy = readLocalCopy(chapter.id);
    if (!copy) return null;
    const differs =
      copy.html !== chapter.contentHtml || copy.title !== chapter.title || copy.position !== String(chapter.position);
    return differs && copy.at > Date.parse(chapter.updatedAt) ? copy : null;
  });

  const draftRef = useRef<Draft>({ title: chapter.title, position: String(chapter.position), html: chapter.contentHtml });
  const statusRef = useRef(chapter.status);
  const timerRef = useRef<number | null>(null);
  // Tiptap 콜백과 타이머가 항상 최신 함수를 부르도록 ref로 잡아 둔다
  const saveRef = useRef<() => Promise<boolean>>(async () => true);
  const changeRef = useRef<() => void>(() => {});

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
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
    const snapshot = { ...draftRef.current };
    const positionNumber = Number(snapshot.position);
    if (!Number.isInteger(positionNumber) || positionNumber < 1) {
      setSaveState('error');
      setMessage({ tone: 'error', text: '회차 번호를 1 이상의 숫자로 입력해 주세요' });
      return false;
    }

    setSaveState('saving');
    try {
      const result = await saveChapter({
        id: chapter.id,
        title: snapshot.title,
        position: positionNumber,
        contentHtml: snapshot.html,
      });
      if (!result.ok) {
        setSaveState('error');
        setMessage({ tone: 'error', text: result.message });
        return false;
      }
      setSavedAt(result.savedAt);
      setMessage((current) => (current?.tone === 'error' ? null : current));
      const latest = draftRef.current;
      const unchanged =
        latest.html === snapshot.html && latest.title === snapshot.title && latest.position === snapshot.position;
      if (unchanged) {
        setSaveState('saved');
        try {
          localStorage.removeItem(storageKey);
        } catch {}
      } else {
        // 저장하는 사이에 더 고쳤으면 이어서 저장
        setSaveState('dirty');
        if (statusRef.current === 'draft') scheduleAutosave();
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
    if (statusRef.current === 'draft') scheduleAutosave();
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
    ],
    content: chapter.contentHtml,
    editorProps: {
      attributes: {
        class: 'novel-body min-h-[55vh] px-5 py-7 sm:px-9 sm:py-9',
        spellcheck: 'false',
        'aria-label': '본문',
      },
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

  // Cmd/Ctrl + S → 저장
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
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

  function updatePosition(value: string) {
    const digits = value.replace(/[^0-9]/g, '').slice(0, 4);
    setPosition(digits);
    draftRef.current.position = digits;
    handleChange();
  }

  function restoreLocalCopy() {
    if (!recovery || !editor) return;
    editor.commands.setContent(recovery.html);
    draftRef.current = { title: recovery.title, position: recovery.position, html: editor.getHTML() };
    setTitle(recovery.title);
    setPosition(recovery.position);
    setCounts(countText(editor));
    setRecovery(null);
    handleChange();
  }

  function discardLocalCopy() {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setRecovery(null);
  }

  function changeStatus(next: 'draft' | 'published') {
    startStatusTransition(async () => {
      // 발행 전에 지금 내용을 먼저 저장
      if (next === 'published' && saveState !== 'saved' && !(await save())) return;
      const result = await setChapterStatus(chapter.id, next);
      if (!result.ok) {
        setMessage({ tone: 'error', text: result.message });
        return;
      }
      statusRef.current = result.status;
      setStatus(result.status);
      setMessage({
        tone: 'info',
        text:
          result.status === 'published'
            ? '발행했어요. 이제 길드원이 볼 수 있어요'
            : '임시저장으로 돌렸어요. 길드원에게는 안 보여요',
      });
    });
  }

  const saveLabel: Record<SaveState, string> = {
    saved: `저장됨 · ${formatTime(new Date(savedAt))}`,
    dirty: status === 'draft' ? '입력 중…' : '반영 안 된 수정이 있어요',
    saving: '저장하는 중…',
    error: '저장 실패',
  };

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link href={`/admin/novels/${chapter.novelId}`} className="max-w-full truncate text-sm font-semibold text-muted hover:text-fg">
          ← {novelTitle}
        </Link>
        <Badge tone={status === 'published' ? 'accent' : 'muted'}>{status === 'published' ? '발행됨' : '임시저장'}</Badge>
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
          {editor ? <Toolbar editor={editor} /> : <div className="h-10" />}
          <div className="flex items-center gap-2">
            {status === 'draft' ? (
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
                <Button type="button" size="sm" onClick={() => changeStatus('published')} disabled={statusPending}>
                  발행하기
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
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void save()}
                  disabled={saveState === 'saved' || saveState === 'saving'}
                >
                  수정 반영
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <EditorContent editor={editor} className="mt-2 rounded-2xl border border-line bg-surface" />

      <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
        {message ? (
          <p role="status" className={cn('text-sm font-medium', message.tone === 'error' ? 'text-danger' : 'text-accent')}>
            {message.text}
          </p>
        ) : (
          <span />
        )}
        <p className="text-[13px] text-muted tabular-nums">
          공백 포함 {formatNumber(counts.all)}자 · 공백 제외 {formatNumber(counts.noSpace)}자
        </p>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        <a
          href={`/novels/${chapter.novelId}/${chapter.id}`}
          target="_blank"
          rel="noreferrer"
          className={buttonClass('secondary', 'sm')}
        >
          열람 화면으로 미리보기 ↗
        </a>
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

function Toolbar({ editor }: { editor: Editor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      strike: current.isActive('strike'),
      quote: current.isActive('blockquote'),
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
    <div role="toolbar" aria-label="서식" className="flex items-center gap-0.5 rounded-xl border border-line bg-surface p-1">
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
    </div>
  );
}
