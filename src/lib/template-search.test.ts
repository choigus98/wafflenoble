import { describe, expect, it } from 'vitest';
import { TEMPLATES } from '@/lib/story-blocks';
import { matchTemplates } from '@/lib/template-search';

const labels = (query: string) => matchTemplates(TEMPLATES, query).map((template) => template.label);

describe('템플릿 찾기', () => {
  it('빈 칸이면 전부 메뉴 순서대로', () => {
    expect(labels('')).toEqual(TEMPLATES.map((template) => template.label));
    expect(labels('   ')).toHaveLength(TEMPLATES.length);
  });

  it('이름 일부, 띄어쓰기·영문 대소문자 무시', () => {
    expect(labels('영수')).toEqual(['영수증']);
    expect(labels('카톡')).toEqual(['카톡 1:1 대화', '카톡 단체방']);
    expect(labels('카톡단체')).toEqual(['카톡 단체방']);
    expect(labels('sns')).toEqual(['SNS 게시물']);
    expect(labels('1:1')).toEqual(['카톡 1:1 대화']);
  });

  it('초성, 초성과 글자 섞기', () => {
    // 이름(영수증)이 먼저, 설명에 '운송장'이 든 택배 배송 조회는 뒤에
    expect(labels('ㅇㅅㅈ')).toEqual(['영수증', '택배 배송 조회']);
    expect(labels('ㅌㅍ')).toEqual(['투표']);
    expect(labels('영ㅅ')).toEqual(['영수증']);
    expect(labels('ㅁㅈ')).toEqual(['문자 메시지']);
  });

  it('한글을 치는 중간에도 이어서 맞춘다', () => {
    expect(labels('영수즈')).toEqual(['영수증']); // 받침을 아직 안 침
    expect(labels('영숮')).toEqual(['영수증']); // 다음 글자 첫소리가 받침으로 붙어 있음
    expect(labels('투ㅍ')).toEqual(['투표']);
    // 가운데 글자는 정확히 맞아야 한다
    expect(labels('여수증')).toEqual([]);
  });

  it('이름에 맞는 것이 먼저, 설명에만 맞는 것은 뒤에', () => {
    // '알림': 이름(후원 알림, 휴대폰 알림) → 설명([퀘스트 발생!] 같은 알림)
    expect(labels('알림')).toEqual(['후원 알림', '휴대폰 알림', '시스템 창 · 퀘스트']);
    expect(labels('합계')).toEqual(['영수증']);
    expect(labels('송금')).toEqual(['송금 완료']);
    expect(labels('은행')).toEqual(['송금 완료']); // 설명 '은행 앱 송금 결과'
  });

  it('맞는 게 없으면 빈 목록', () => {
    expect(labels('xyz')).toEqual([]);
    expect(labels('ㅋㅋㅋ')).toEqual([]);
  });
});
