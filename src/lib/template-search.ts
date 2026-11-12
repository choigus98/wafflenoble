// '＋ 템플릿' 메뉴 찾기 칸: 템플릿 이름·설명으로 거른다 (맞추는 규칙은 lib/korean-search.ts).
// 이름에 맞는 것을 먼저, 설명에만 맞는 것은 뒤에 (각각은 메뉴 순서 그대로)

import { koreanIncludes } from '@/lib/korean-search';

export function matchTemplates<T extends { label: string; hint: string }>(templates: readonly T[], query: string): T[] {
  if (!query.trim()) return [...templates];
  const byLabel: T[] = [];
  const byHint: T[] = [];
  for (const template of templates) {
    if (koreanIncludes(template.label, query)) byLabel.push(template);
    else if (koreanIncludes(template.hint, query)) byHint.push(template);
  }
  return [...byLabel, ...byHint];
}
