// 회차를 .txt로 내보내기: 에디터 문서(ProseMirror JSON)를 다른 곳에 옮겨 적기 좋은 글로 푼다.
// - 문단은 한 줄씩 (빈 문단은 빈 줄로 남겨서 작가가 띄운 간격 그대로), 문단 안 줄바꿈은 줄바꿈
// - 장면 전환은 '* * *', 인용은 줄마다 '> '
// - 굵게·기울임·취소선은 글자만 남긴다
// - 템플릿은 '[카톡 1:1 대화]'처럼 머리를 달고, 대본·카드 글을 보이는 순서대로 (빈 칸은 뺌)
// 에디터 문서를 바로 읽어서 HTML 정리 라이브러리를 화면 쪽에 싣지 않아도 되고, 저장 안 한 수정도 들어간다

import {
  CALL_DETAIL_DEFAULT,
  kakaoTitle,
  parseMatchScript,
  parseParcelScript,
  parseTicketDetails,
  parsePollScript,
  parseRankScript,
  parseReceiptScript,
  parseScript,
  parseStoryBlock,
  parseTodoScript,
  parseWeatherScript,
  pollStatus,
  rankChangeText,
  receiptTotal,
  smsContact,
  templateLabel,
  todoProgress,
  type StoryBlock,
} from '@/lib/story-blocks';

export type DocNode = { type: string; text?: string; attrs?: Record<string, unknown>; content?: DocNode[] };

const SCENE_BREAK = '* * *';

export function inlineText(node: DocNode): string {
  return (node.content ?? []).map((child) => (child.type === 'text' ? (child.text ?? '') : child.type === 'hardBreak' ? '\n' : inlineText(child))).join('');
}

/** 빈 칸은 빼고 줄을 모은다 */
function lines(...values: Array<string | false | null | undefined>): string[] {
  return values.flatMap((value) => (typeof value === 'string' && value.trim() ? [value.trim()] : []));
}

/** 템플릿 하나를 글로: 머리 '[이름]' + 보이는 순서대로의 글 */
export function storyBlockToText(block: StoryBlock): string {
  const head = `[${templateLabel(block)}]`;
  const body: string[] = (() => {
    switch (block.kind) {
      case 'kakao': {
        const { data } = block;
        const title = kakaoTitle(data, parseScript(data.script));
        return lines(data.mode === 'group' && data.memberCount.trim() ? `${title} (${data.memberCount.trim()}명)` : title, data.script);
      }
      case 'chat':
        return lines(block.data.title, block.data.badge, block.data.script);
      case 'sms':
        return lines(smsContact(block.data, parseScript(block.data.script)), block.data.script);
      case 'post': {
        const { data } = block;
        const meta = [data.author, data.date].map((value) => value.trim()).filter(Boolean).join(' · ');
        const counts = [data.views.trim() && `조회 ${data.views.trim()}`, data.likes.trim() && `추천 ${data.likes.trim()}`].filter(Boolean).join(' · ');
        return lines(data.board, data.title, meta, counts, data.body, data.script.trim() && `— 댓글 —\n${data.script.trim()}`);
      }
      case 'system':
        return lines(block.data.title, block.data.script);
      case 'news': {
        const { data } = block;
        return lines(data.press, data.title, data.subtitle, [data.reporter, data.date].map((value) => value.trim()).filter(Boolean).join(' · '), data.body);
      }
      case 'call': {
        const { data } = block;
        return lines(data.mode === 'incoming' ? '걸려 오는 전화' : '통화 중', data.name, data.detail.trim() || CALL_DETAIL_DEFAULT[data.mode]);
      }
      case 'note':
        return lines(block.data.to, block.data.body, block.data.from);
      case 'sns': {
        const { data } = block;
        const who = [data.name.trim(), data.handle.trim() && `@${data.handle.trim().replace(/^@/, '')}`].filter(Boolean).join(' ');
        const counts = [data.reposts.trim() && `재게시 ${data.reposts.trim()}`, data.likes.trim() && `좋아요 ${data.likes.trim()}`].filter(Boolean).join(' · ');
        return lines(who, data.body, data.date, counts, data.script.trim() && `— 답글 —\n${data.script.trim()}`);
      }
      case 'mail': {
        const { data } = block;
        return lines(
          data.subject && `제목: ${data.subject.trim()}`,
          data.from.trim() && `보낸 사람: ${data.from.trim()}`,
          data.to.trim() && `받는 사람: ${data.to.trim()}`,
          data.date,
          data.body,
          data.attachment.trim() && `첨부: ${data.attachment.trim()}`,
        );
      }
      case 'search': {
        const { data } = block;
        return lines(data.engine.trim() ? `${data.engine.trim()} · ${data.query}` : data.query, data.count, data.script);
      }
      case 'push':
        return lines([block.data.date, block.data.time].map((value) => value.trim()).filter(Boolean).join(' '), block.data.script);
      case 'receipt': {
        const { data } = block;
        const total = receiptTotal(data, parseReceiptScript(data.script));
        return lines(data.store, data.info, data.date, data.script, total && `합계: ${total}`, data.footer);
      }
      case 'location':
        return lines(block.data.badge, block.data.place, block.data.address, block.data.note);
      case 'poll': {
        const { data } = block;
        return lines(data.badge, data.question, data.script, pollStatus(data, parsePollScript(data.script)));
      }
      case 'transfer': {
        const { data } = block;
        return lines(
          data.bank,
          [data.status, data.amount].map((value) => value.trim()).filter(Boolean).join(' '),
          data.to.trim() && `받는 분: ${data.to.trim()}`,
          data.from.trim() && `보낸 계좌: ${data.from.trim()}`,
          data.memo.trim() && `메모: ${data.memo.trim()}`,
          data.date.trim() && `일시: ${data.date.trim()}`,
        );
      }
      case 'subway': {
        const { data } = block;
        const around = [data.prev.trim() && `이전 역: ${data.prev.trim()}`, data.next.trim() && `다음 역: ${data.next.trim()}`].filter(Boolean).join(' · ');
        return lines([data.line, data.direction].map((value) => value.trim()).filter(Boolean).join(' · '), data.station.trim() && `이번 역: ${data.station.trim()}`, around, data.message);
      }
      case 'match': {
        const { data } = block;
        const records = parseMatchScript(data.script)
          .map((line) => (line.kind === 'divider' ? (line.label ? `— ${line.label} —` : '—') : line.record ? `${line.mine ? '* ' : ''}${line.name}: ${line.record}` : `${line.mine ? '* ' : ''}${line.name}`))
          .join('\n');
        return lines(
          [data.result, data.game].map((value) => value.trim()).filter(Boolean).join(' · '),
          [data.score, data.time].map((value) => value.trim()).filter(Boolean).join(' · '),
          data.mvp.trim() && `MVP: ${data.mvp.trim()}`,
          records,
        );
      }
      case 'ticket': {
        const { data } = block;
        const end = (code: string, name: string, time: string) => [code, name, time].map((value) => value.trim()).filter(Boolean).join(' ');
        const route = [end(data.from, data.fromName, data.departs), end(data.to, data.toName, data.arrives)].filter(Boolean).join(' → ');
        const details = parseTicketDetails(data.script)
          .map((detail) => (detail.label ? `${detail.label}: ${detail.value}` : detail.value))
          .join(' · ');
        return lines(data.carrier, route, data.date, data.passenger.trim() && `승객: ${data.passenger.trim()}`, details);
      }
      case 'parcel': {
        const { data } = block;
        const records = parseParcelScript(data.script)
          .map((record) => [record.time, record.place && `${record.place}:`, record.detail].filter(Boolean).join(' '))
          .join('\n');
        return lines(
          [data.carrier.trim(), data.tracking.trim() && `운송장 ${data.tracking.trim()}`].filter(Boolean).join(' · '),
          data.item,
          data.status.trim() && `지금 상태: ${data.status.trim()}`,
          data.eta,
          records,
        );
      }
      case 'weather': {
        const { data } = block;
        const hours = parseWeatherScript(data.script)
          .map((hour) => [hour.time && `${hour.time}:`, hour.condition, hour.temp].filter(Boolean).join(' '))
          .join('\n');
        return lines(data.place, [data.temp, data.condition].map((value) => value.trim()).filter(Boolean).join(' '), data.range, data.note, hours);
      }
      case 'namecard': {
        const { data } = block;
        return lines(
          data.company,
          [data.name, data.role].map((value) => value.trim()).filter(Boolean).join(' · '),
          data.phone.trim() && `전화 ${data.phone.trim()}`,
          data.email.trim() && `메일 ${data.email.trim()}`,
          data.address,
          data.memo.trim() && `메모: ${data.memo.trim()}`,
        );
      }
      case 'todo': {
        const items = parseTodoScript(block.data.script);
        const { done, total } = todoProgress(items);
        const rows = items.map((line) => (line.type === 'section' ? (line.text ? `— ${line.text} —` : '---') : `${line.done ? '[x]' : '[ ]'} ${line.text}`));
        return lines(block.data.date, block.data.title, rows.join('\n'), total > 0 && `${done}/${total} 완료`);
      }
      case 'rank': {
        const rows = parseRankScript(block.data.script).map((line) =>
          line.type === 'gap'
            ? '⋯'
            : `${line.mine ? '* ' : ''}${line.rank}. ${line.name}${line.score ? `: ${line.score}` : ''}${line.change ? ` ${rankChangeText(line.change)}` : ''}`,
        );
        return lines(block.data.title, block.data.badge, rows.join('\n'));
      }
      case 'music': {
        const { data } = block;
        const time = [data.elapsed, data.duration].map((value) => value.trim()).filter(Boolean).join(' / ');
        const lyric = data.lyric
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => `♪ ${line}`)
          .join('\n');
        return lines(data.app, data.title, data.artist, time, lyric);
      }
      case 'item': {
        const { data } = block;
        return lines(data.title, data.name, [data.grade.trim() && `[${data.grade.trim()}]`, data.category.trim()].filter(Boolean).join(' '), data.script);
      }
      case 'event': {
        const { data } = block;
        return lines(
          data.calendar,
          data.title,
          data.date,
          data.time,
          data.place.trim() && `장소: ${data.place.trim()}`,
          data.alert.trim() && `알림: ${data.alert.trim()}`,
          data.note,
        );
      }
      case 'alarm': {
        const { data } = block;
        return lines(data.date, [data.period, data.time].map((value) => value.trim()).filter(Boolean).join(' '), data.label, data.days.trim() && `반복: ${data.days.trim()}`);
      }
      case 'live': {
        const { data } = block;
        return lines([data.streamer, data.badge].map((value) => value.trim()).filter(Boolean).join(' · '), data.title, data.viewers.trim() && `시청자 ${data.viewers.trim()}명`, data.category);
      }
      case 'donation': {
        const { data } = block;
        return lines(
          data.platform,
          [data.donor, data.amount].map((value) => value.trim()).filter(Boolean).join(' · '),
          data.message,
          data.footer.trim() || (data.donor.trim() ? `${data.donor.trim()} 님이 치즈 후원을 보냈습니다.` : ''),
        );
      }
    }
  })();
  return [head, ...body].join('\n');
}

/**
 * 본문 블록들을 글 줄로. 템플릿 앞뒤는 정확히 한 줄씩 띄운다 (앞뒤 문단과 붙어 보이지 않게).
 * 작가가 넣은 빈 문단이 이미 그 자리에 있으면 그 줄로 대신하고, 템플릿끼리 붙어 있어도 한 줄만
 */
export function bodyText(doc: DocNode): string {
  const out: string[] = [];
  let blankAfterBlock = false;
  const push = (line: string) => {
    if (blankAfterBlock && line !== '') out.push('');
    blankAfterBlock = false;
    out.push(line);
  };
  for (const node of doc.content ?? []) {
    if (node.type === 'paragraph') push(inlineText(node));
    else if (node.type === 'horizontalRule') push(SCENE_BREAK);
    else if (node.type === 'blockquote') {
      for (const child of node.content ?? []) for (const line of inlineText(child).split('\n')) push(`> ${line}`.trimEnd());
    } else if (node.type === 'storyBlock') {
      const block = parseStoryBlock(node.attrs?.kind, node.attrs?.data);
      if (!block) continue;
      if (out.length > 0 && out.at(-1) !== '') out.push('');
      blankAfterBlock = false;
      out.push(storyBlockToText(block));
      blankAfterBlock = true;
    }
  }
  // 앞뒤 빈 줄은 뺀다
  return out.join('\n').replace(/^\n+|\n+$/g, '');
}

export function chapterToText(input: { novelTitle: string; position: number | string; title: string; doc: DocNode; authorNote: string }): string {
  const heading = [`『${input.novelTitle.trim()}』`, `${input.position}화`, input.title.trim()].filter(Boolean).join(' ');
  const parts = [heading, bodyText(input.doc)];
  if (input.authorNote.trim()) parts.push(`[작가의 말]\n${input.authorNote.trim()}`);
  return `${parts.filter(Boolean).join('\n\n')}\n`;
}

/** 내려받을 파일 이름: '달빛 와플 가게의 비밀 3화 템플릿 예시.txt' (파일 이름에 못 쓰는 글자는 뺌) */
export function chapterFileName(novelTitle: string, position: number | string, title: string): string {
  const name = [novelTitle.trim(), `${position}화`, title.trim()]
    .filter(Boolean)
    .join(' ')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return `${[...name].slice(0, 80).join('') || '회차'}.txt`;
}

const CHAPTER_RULE = '──────────';

/**
 * 작품 전체를 한 글로: 맨 위 『작품』과 소개, 회차마다 구분선 · 'N화 제목' · 본문 · 작가의 말.
 * 회차 본문 규칙은 회차 하나 내보내기(chapterToText)와 같다
 */
export function novelToText(input: {
  title: string;
  description: string;
  chapters: Array<{ position: number; title: string; doc: DocNode; authorNote: string }>;
}): string {
  const parts = [`『${input.title.trim()}』`];
  if (input.description.trim()) parts.push(input.description.trim());
  if (input.chapters.length === 0) parts.push('(내보낼 회차가 없어요)');
  for (const chapter of input.chapters) {
    const section = [CHAPTER_RULE, [`${chapter.position}화`, chapter.title.trim()].filter(Boolean).join(' ')];
    const body = bodyText(chapter.doc);
    const lines = [section.join('\n\n')];
    if (body) lines.push(body);
    if (chapter.authorNote.trim()) lines.push(`[작가의 말]\n${chapter.authorNote.trim()}`);
    parts.push(lines.join('\n\n'));
  }
  return `${parts.join('\n\n')}\n`;
}

/** 작품 전체 파일 이름: '달빛 와플 가게의 비밀 (발행 회차).txt' */
export function novelFileName(title: string, scope: 'all' | 'published'): string {
  const name = title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim();
  return `${[...name].slice(0, 70).join('') || '작품'} (${scope === 'published' ? '발행 회차' : '전체 회차'}).txt`;
}
