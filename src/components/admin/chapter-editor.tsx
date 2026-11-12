'use client';

import { Placeholder } from '@tiptap/extensions';
import { Fragment, Slice, type Schema } from '@tiptap/pm/model';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition, type ReactNode, type RefObject } from 'react';
import { deleteChapter, saveChapter, scheduleChapter, setChapterStatus } from '@/app/admin/actions';
import {
  StoryBlockNode,
  createTemplateEditingStore,
  useEditingTemplateUid,
} from '@/components/admin/story-block/story-block-node';
import { TemplateMenu } from '@/components/admin/story-block/template-menu';
import { SubmitButton } from '@/components/submit-button';
import { Badge, Button, buttonClass } from '@/components/ui';
import { useDismiss } from '@/components/use-dismiss';
import { formatNumber, formatSchedule, formatTime } from '@/lib/format';
import { plainTextToBlocks } from '@/lib/paste';
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
  const [authorNote, setAuthorNote] = useState(chapter.authorNote);
  const [status, setStatus] = useState(chapter.status);
  const [publishAt, setPublishAt] = useState(chapter.publishedAt);
  const [scheduled, setScheduled] = useState(chapter.scheduled);
  // 예약 창에 띄울 기본 시각 (창이 열려 있을 때만 값이 있음)
  const [scheduleDraft, setScheduleDraft] = useState<string | null>(null);
  const scheduleButtonRef = useRef<HTMLButtonElement>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [message, setMessage] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);
  const [savedAt, setSavedAt] = useState(chapter.updatedAt);
  const [counts, setCounts] = useState({ all: 0, noSpace: 0 });
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
          {editor ? <Toolbar editor={editor} /> : <div className="h-10" />}
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
      <TemplateMenu editor={editor} />
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
    </div>
  );
}
