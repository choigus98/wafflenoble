// 앱 아이콘(PNG)용 와플 그림. next/og(ImageResponse)가 그리는 JSX라서 flex·인라인 스타일만 쓴다.
// 비율은 src/app/icon.svg와 같다 (판 28칸 중 바깥 여백 5, 칸 5, 칸 사이 1.5)

const BASE = '#d9952f';
const CELL = '#a8661a';

/**
 * @param size  그림 한 변 (px)
 * @param fullBleed  배경을 꽉 채울지 (아이폰·마스크용). false면 둥근 판만 그린다
 * @param safeInset  판 바깥 여백 비율 (마스크 아이콘의 안전 영역용)
 */
export function WaffleArt({ size, fullBleed = false, safeInset = 0 }: { size: number; fullBleed?: boolean; safeInset?: number }) {
  const board = size * (1 - safeInset * 2);
  const unit = board / 28;
  const cell = unit * 5;
  const gap = unit * 1.5;
  const cells = [0, 1, 2];

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: fullBleed ? BASE : 'transparent',
      }}
    >
      <div
        style={{
          width: board,
          height: board,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: BASE,
          borderRadius: fullBleed ? 0 : unit * 8,
        }}
      >
        {cells.map((row) => (
          <div key={row} style={{ display: 'flex', marginTop: row === 0 ? 0 : gap }}>
            {cells.map((column) => (
              <div
                key={column}
                style={{ width: cell, height: cell, marginLeft: column === 0 ? 0 : gap, background: CELL, borderRadius: unit * 1.4 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
