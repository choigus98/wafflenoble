'use client';

import { BOOKMARKS_CHANGE, BOOKMARKS_KEY, type Bookmark } from '@/lib/bookmarks';

// 책갈피 저장소 (이 기기의 localStorage). 회차 화면의 책갈피 단추와 작품 화면 목록이 같이 쓰고,
// 다른 탭에서 바뀌어도(storage 이벤트) 바로 따라간다

export function subscribeBookmarks(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(BOOKMARKS_CHANGE, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(BOOKMARKS_CHANGE, callback);
  };
}

export function readBookmarksRaw(): string {
  try {
    return localStorage.getItem(BOOKMARKS_KEY) ?? '[]';
  } catch {
    return '[]';
  }
}

export function saveBookmarks(list: Bookmark[]) {
  try {
    if (list.length === 0) localStorage.removeItem(BOOKMARKS_KEY);
    else localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
  } catch {
    // 저장이 막힌 브라우저(비공개 모드 등)에서는 이번 화면에서만
  }
  window.dispatchEvent(new Event(BOOKMARKS_CHANGE));
}
