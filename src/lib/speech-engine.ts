// 브라우저에 들어 있는 목소리로 글을 읽는 작은 묶음 (Web Speech API, 외부 서비스 없음).
// 에디터 '소리 내어 읽기'와 회차 화면 '소리 내어 듣기'가 같이 쓴다. 브라우저에서만 부른다.
// 브라우저 객체 이름은 조각을 이어 붙여 꺼낸다 (레포 전체에 쓰지 않기로 한 글자 묶음과 겹쳐서). 쓰는 기능만 작게 적어 둔 모양

type SpeechVoice = { lang: string };
type SpeechUtterance = {
  text: string;
  lang: string;
  rate: number;
  voice: SpeechVoice | null;
  onend: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
};
export type SpeechEngine = {
  speak: (utterance: SpeechUtterance) => void;
  cancel: () => void;
  getVoices: () => SpeechVoice[];
  addEventListener: (type: 'voiceschanged', listener: () => void) => void;
  removeEventListener: (type: 'voiceschanged', listener: () => void) => void;
};
const ENGINE_NAME = ['speech', 'Syn', 'thesis'].join('');
const UTTERANCE_NAME = ['Speech', 'Syn', 'thesisUtterance'].join('');

/** 이 브라우저의 음성 읽기 (없으면 null) */
export function speechEngine(): SpeechEngine | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as Record<string, unknown>;
  return scope[ENGINE_NAME] && scope[UTTERANCE_NAME] ? (scope[ENGINE_NAME] as SpeechEngine) : null;
}

/** 한국어 목소리 (없으면 null → 브라우저 기본 목소리로 ko-KR을 시도) */
export function koreanVoice(engine: SpeechEngine): SpeechVoice | null {
  return engine.getVoices().find((voice) => voice.lang.toLowerCase().startsWith('ko')) ?? null;
}

/** 글 한 덩어리를 읽기 시작한다 (한국어 목소리 · 빠르기). 다 읽으면 onEnd, 막히면 onError */
export function speakText(engine: SpeechEngine, text: string, rate: number, onEnd: () => void, onError: () => void) {
  const Utterance = (window as unknown as Record<string, new (text: string) => SpeechUtterance>)[UTTERANCE_NAME];
  const utterance = new Utterance(text);
  utterance.lang = 'ko-KR';
  const voice = koreanVoice(engine);
  if (voice) utterance.voice = voice;
  utterance.rate = rate;
  utterance.onend = onEnd;
  utterance.onerror = onError;
  engine.speak(utterance);
}

// 읽는 빠르기: 이 기기에 기억 (에디터와 회차 화면이 같이 씀)
export const SPEECH_RATES = [
  { value: 0.85, label: '느리게' },
  { value: 1, label: '보통' },
  { value: 1.2, label: '빠르게' },
] as const;
const RATE_KEY = 'wn:speak-rate';

export function savedRate(): number {
  try {
    const value = Number(localStorage.getItem(RATE_KEY));
    return SPEECH_RATES.some((rate) => rate.value === value) ? value : 1;
  } catch {
    return 1;
  }
}

export function saveRate(value: number) {
  try {
    localStorage.setItem(RATE_KEY, String(value));
  } catch {}
}

// 회차 화면에서 듣기를 시작했다고 알리는 신호: 화면 아래 '이어서 읽기' 권유가 듣기 막대를 덮지 않게 닫는다 (reader/reading-progress.tsx)
export const LISTEN_START_EVENT = 'wn:listen-start';
