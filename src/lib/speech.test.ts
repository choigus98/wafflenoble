import { Schema } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import { speechProgress, speechUnitFrom } from '@/lib/speech';
import { createTemplate } from '@/lib/story-blocks';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    blockquote: { group: 'block', content: 'paragraph+' },
    horizontalRule: { group: 'block' },
    storyBlock: { group: 'block', atom: true, attrs: { kind: { default: null }, data: { default: null } } },
    text: { group: 'inline' },
    hardBreak: { group: 'inline', inline: true },
  },
});
const p = (text = '') => schema.node('paragraph', null, text ? [schema.text(text)] : []);
const music = createTemplate('music');

describe('소리 내어 읽기', () => {
  // 0: 첫 문단(크기 7), 7: 빈 문단, 9: 장면 전환, 10: 템플릿, 11: 줄바꿈 있는 문단, 21: 인용
  const doc = schema.node('doc', null, [
    p('첫 문단.'),
    p(),
    schema.node('horizontalRule'),
    schema.node('storyBlock', { kind: music.kind, data: music.data }),
    schema.node('paragraph', null, [schema.text('위 줄'), schema.node('hardBreak'), schema.text('아래 줄')]),
    schema.node('blockquote', null, [p('편지 첫 줄'), p('둘째 줄')]),
  ]);

  it('커서가 있는 문단부터, 빈 문단·장면 전환은 건너뛰고, 템플릿은 글로 풀어서 (머리 괄호는 뗌)', () => {
    expect(speechUnitFrom(doc, 3, true)).toEqual({ pos: 0, text: '첫 문단.' });
    const template = speechUnitFrom(doc, 0, false);
    expect(template?.pos).toBe(10);
    expect(template?.text.split('\n').slice(0, 3)).toEqual(['음악 재생.', '지금 재생 중', '골목 끝의 단맛']);
    expect(speechUnitFrom(doc, 10, false)).toEqual({ pos: 11, text: '위 줄 아래 줄' });
    expect(speechUnitFrom(doc, 11, false)).toEqual({ pos: 21, text: '편지 첫 줄 둘째 줄' });
    // 빈 문단에 커서가 있으면 다음 읽을 것부터, 끝이면 null
    expect(speechUnitFrom(doc, 8, true)?.pos).toBe(10);
    expect(speechUnitFrom(doc, doc.content.size, true)).toBeNull();
  });

  it('몇 번째인지와 모두 몇 개인지 (읽을 것만 셈)', () => {
    expect(speechProgress(doc, 0)).toEqual({ index: 1, total: 4 });
    expect(speechProgress(doc, 11)).toEqual({ index: 3, total: 4 });
  });
});
