import { Schema } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import { editSpotAt, editSpotPosition, noteEditSpot, parseEditSpots, type EditSpot } from '@/lib/edit-spot';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    blockquote: { group: 'block', content: 'paragraph+' },
    storyBlock: { group: 'block', atom: true, attrs: { kind: { default: null }, data: { default: null } } },
    text: { group: 'inline' },
  },
});
const p = (text: string) => schema.node('paragraph', null, text ? [schema.text(text)] : []);
const rest = () => [schema.node('storyBlock', { kind: 'kakao', data: {} }), schema.node('blockquote', null, [p('인용 안 글')]), p('')];
// 위치: 첫 문단 0~6, 둘째 문단 6~27(글 7~26), 템플릿 27, 인용 28~38, 빈 문단 38~40
const doc = schema.node('doc', null, [p('첫 문단'), p('둘째 문단에서 이어서 쓰는 중이었다'), ...rest()]);
const spot = (patch: Partial<EditSpot> = {}): EditSpot => ({ index: 1, offset: 20, snippet: '둘째 문단에서 이어서 쓰는 중이었다', before: '…이어서 쓰는 중이었다', at: 1000, ...patch });

describe('쓰던 곳으로', () => {
  it('자리 기억: 덩어리 순번 · 안쪽 위치 · 첫머리 · 바로 앞 글(12자, 넘으면 앞에 …)', () => {
    expect(editSpotAt(doc, 26, 1000)).toEqual(spot());
    // 빈 문단에서 멈췄으면 바로 앞 글은 앞 덩어리들에서 (템플릿·문단 사이는 한 칸)
    expect(editSpotAt(doc, 39, 1000)).toEqual({ index: 4, offset: 1, snippet: '', before: '…중이었다 인용 안 글', at: 1000 });
    expect(editSpotAt(doc, 3, 1000)?.before).toBe('첫');
  });

  it('다시 찾기: 그대로면 같은 자리, 앞에 문단이 생겨 밀렸으면 첫머리로, 글이 바뀌었으면 같은 순번에서 길이에 맞춰', () => {
    expect(editSpotPosition(doc, spot())).toBe(26);
    const shifted = schema.node('doc', null, [p('새로 넣은 문단'), p('첫 문단'), p('둘째 문단에서 이어서 쓰는 중이었다'), ...rest()]);
    const moved = shifted.resolve(editSpotPosition(shifted, spot()));
    expect([moved.parent.textContent, moved.parentOffset]).toEqual(['둘째 문단에서 이어서 쓰는 중이었다', 19]);
    const shortened = schema.node('doc', null, [p('첫 문단'), p('둘째 문단을 줄였다'), ...rest()]);
    const clamped = shortened.resolve(editSpotPosition(shortened, spot()));
    expect([clamped.parent.textContent, clamped.parentOffset]).toEqual(['둘째 문단을 줄였다', 10]);
    // 템플릿 자리는 그 앞, 본문보다 뒤 순번은 마지막 덩어리
    expect(editSpotPosition(doc, spot({ index: 2, offset: 0, snippet: '' }))).toBe(27);
    expect(doc.resolve(editSpotPosition(doc, spot({ index: 30, snippet: '없는 글' }))).parent.type.name).toBe('paragraph');
  });

  it('저장 값 읽기는 모양이 틀린 것을 버리고, 100회차가 넘으면 오래전에 쓴 회차부터 뺌', () => {
    expect(parseEditSpots(null)).toEqual({});
    expect(parseEditSpots('{망가짐')).toEqual({});
    expect(parseEditSpots('[1]')).toEqual({});
    expect(parseEditSpots(JSON.stringify({ 2: spot(), x: spot(), 3: { ...spot(), index: -1 }, 4: { ...spot(), before: 1 } }))).toEqual({ 2: spot() });
    let spots = {};
    for (let id = 1; id <= 100; id += 1) spots = noteEditSpot(spots, id, spot({ at: id }));
    const next = noteEditSpot(spots, 500, spot({ at: 5000 }));
    expect(Object.keys(next)).toHaveLength(100);
    expect(next['1']).toBeUndefined();
    expect(next['500']?.at).toBe(5000);
    // 이미 있는 회차는 바꾸기만 (빼지 않음)
    expect(Object.keys(noteEditSpot(spots, 7, spot({ at: 1 })))).toHaveLength(100);
  });
});
