import { Extension } from '@tiptap/react';
import { announce } from '@/lib/announce';
import { quoteWrapTr } from '@/lib/quote-wrap';

// 회차 에디터 '따옴표로 감싸기': ⌘' (Ctrl+')로 고른 글을 “ ”로 감싸고, 다시 누르면 ‘ ’ → 「 」 → 『 』 → 벗기기.
// 짝 고르기는 lib/quotes.ts, 문서 바꾸기(감싼 따옴표의 글자 모양 · 고른 범위)는 lib/quote-wrap.ts.
// 한 문단 안에서만 (여러 문단에 걸쳐 고르면 알려 주고 그대로), 템플릿을 고른 상태면 아무 일도 하지 않음

export const QuoteWrap = Extension.create({
  name: 'quoteWrap',

  addKeyboardShortcuts() {
    return {
      "Mod-'": () => {
        const result = quoteWrapTr(this.editor.state);
        if (!result) return false;
        if (result.tr) this.editor.view.dispatch(result.tr);
        announce(result.message);
        return true;
      },
    };
  },
});
