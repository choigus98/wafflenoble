// 열람 '다음 화 미리 보기'의 첫 문장: 문단 글에서 첫 문장(마침표·물음표·느낌표·말줄임표 뒤에 띄어쓰기나 끝이 오는 곳)까지.
// 닫는 따옴표·괄호는 문장에 붙이고('“어서 와.”'), 숫자 사이 점('1.5')은 문장 끝으로 안 친다.
// 너무 짧은 문장('아.' '“응.”')은 다음 문장까지 이어서 열 자는 넘게, 그래도 길면 80자에서 자른다

const SENTENCE_END = /[.?!…。？！]+["'”’」』)\]）]*(?=\s|$)/g;
const MIN_LENGTH = 10;

export function firstSentence(text: string, max = 80): string {
  const line = text.replace(/\s+/g, ' ').trim();
  let cut = line.length;
  for (const match of line.matchAll(SENTENCE_END)) {
    const end = match.index + match[0].length;
    if ([...line.slice(0, end)].length >= MIN_LENGTH) {
      cut = end;
      break;
    }
  }
  const sentence = [...line.slice(0, cut)];
  return sentence.length > max ? `${sentence.slice(0, max).join('')}…` : sentence.join('');
}
