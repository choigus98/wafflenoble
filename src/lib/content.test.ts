import { describe, expect, it } from 'vitest';
import { countCharacters, sanitizeChapterHtml } from '@/lib/content';

describe('본문 정제', () => {
  it('에디터에서 만들 수 있는 태그만 남긴다 (빈 태그는 <br /> 형태로 저장)', () => {
    const html =
      '<p>문단 <strong>굵게</strong> <em>기울임</em> <s>취소</s><br></p><hr><blockquote><p>인용</p></blockquote>';
    expect(sanitizeChapterHtml(html)).toBe(
      '<p>문단 <strong>굵게</strong> <em>기울임</em> <s>취소</s><br /></p><hr /><blockquote><p>인용</p></blockquote>',
    );
  });

  it('스크립트·이벤트·스타일·링크는 걷어낸다', () => {
    const dirty =
      '<p style="color:red" onclick="alert(1)">글</p><script>alert(1)</script><a href="javascript:alert(1)">링크</a><img src=x onerror=alert(1)>';
    const clean = sanitizeChapterHtml(dirty);
    expect(clean).toBe('<p>글</p>링크');
  });

  it('일반 div에는 속성을 남기지 않는다', () => {
    expect(sanitizeChapterHtml('<div class="x" data-foo="1">a</div>')).toBe('<div>a</div>');
  });
});

describe('글자수', () => {
  it('공백 포함으로 세고, 문단 사이 줄바꿈은 세지 않는다', () => {
    expect(countCharacters('<p>가나 다</p><p>라</p>')).toBe(5);
  });

  it('특수문자 이스케이프는 한 글자로 센다', () => {
    expect(countCharacters('<p>A &amp; B &lt;3</p>')).toBe(8);
  });

  it('템플릿 블록 안의 글은 세지 않는다', () => {
    expect(countCharacters('<p>본문</p><div data-wn-block="live" data-wn-data="{&quot;title&quot;:&quot;제목&quot;}"></div>')).toBe(2);
  });
});
