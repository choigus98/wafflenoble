/** 폼 서버 액션의 공통 결과 형태 */
export type ActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; message?: string; at: number };

export const IDLE: ActionState = { status: 'idle' };
