import { memo } from 'react';
import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

/** 빛새김 마스코트 "새싹이" — 성장 단계와 표정을 props로 그리는 순수 SVG 캐릭터. */

export type SproutStage = 'seed' | 'sprout' | 'seedling' | 'bud' | 'bloom';
export type SproutMood = 'default' | 'proud' | 'cheer' | 'sleepy';

/** 성장 단계 순서와 도달 빛점수(§ 게임화 기획서와 동일). */
export const SPROUT_STAGES: { stage: SproutStage; label: string; minPoints: number }[] = [
  { stage: 'seed', label: '씨앗', minPoints: 0 },
  { stage: 'sprout', label: '새싹', minPoints: 50 },
  { stage: 'seedling', label: '떡잎', minPoints: 150 },
  { stage: 'bud', label: '꽃봉오리', minPoints: 400 },
  { stage: 'bloom', label: '활짝 꽃', minPoints: 800 },
];

/** 누적 빛점수 → 현재 성장 단계. */
export function stageForPoints(points: number): SproutStage {
  let current: SproutStage = 'seed';
  for (const s of SPROUT_STAGES) {
    if (points >= s.minPoints) current = s.stage;
  }
  return current;
}

const C = {
  cream: '#FBEFD6',
  creamOutline: '#E7D4A8',
  leaf: '#7DB56A',
  leafAlt: '#93C579',
  leafDark: '#5C8B4A',
  blush: '#F0A08C',
  petal: '#F7B7C6',
  petalAlt: '#F9C6D3',
  petalCenter: '#F6D06B',
  petalCenterOutline: '#E9B94A',
  seed: '#C9A063',
  seedDark: '#A67F3D',
  ink: '#4A3F30',
  spark: '#F6D06B',
  shadow: '#3A5A20',
  dullLeaf: '#9DC58A',
  dullLeafAlt: '#AECF98',
  dullLeafDark: '#7A9E68',
  dullCream: '#F6EEDB',
} as const;

type Props = {
  size?: number;
  stage?: SproutStage;
  mood?: SproutMood;
  style?: object;
};

function SproutBase({ size = 120, stage = 'seedling', mood = 'default', style }: Props) {
  const height = (size * 190) / 160;
  return (
    <Svg width={size} height={height} viewBox="0 0 160 190" style={style}>
      <Ellipse cx={80} cy={178} rx={36} ry={7} fill={C.shadow} opacity={0.12} />
      {stage === 'seed' ? (
        <Seed mood={mood} />
      ) : stage === 'sprout' ? (
        <SproutStageBody mood={mood} />
      ) : (
        <GrownBody stage={stage} mood={mood} />
      )}
    </Svg>
  );
}

/** Lv.1 씨앗 — 아직 몸이 없는 작은 씨앗. */
function Seed({ mood }: { mood: SproutMood }) {
  return (
    <G>
      <Path
        d="M80 78 C 108 78 113 108 98 130 C 90 142 70 142 62 130 C 47 108 52 78 80 78 Z"
        fill={C.seed}
        stroke={C.seedDark}
        strokeWidth={3.4}
      />
      <Path d="M80 84 C 80 104 80 122 80 138" stroke={C.seedDark} strokeWidth={2} fill="none" opacity={0.45} />
      <Face mood={mood} cx={80} eyeY={112} mouthY={124} scale={0.82} />
    </G>
  );
}

/** Lv.2 새싹 — 작은 몸에 새싹 하나. */
function SproutStageBody({ mood }: { mood: SproutMood }) {
  return (
    <G>
      <Path d="M80 66 C 100 66 105 58 80 40 C 55 58 60 66 80 66 Z" fill={C.leaf} stroke={C.leafDark} strokeWidth={2.4} />
      <Rect x={75.5} y={60} width={9} height={20} rx={4.5} fill={C.leafDark} />
      <Ellipse cx={80} cy={118} rx={44} ry={46} fill={C.cream} stroke={C.creamOutline} strokeWidth={3.2} />
      <Face mood={mood} cx={80} eyeY={116} mouthY={130} scale={0.9} />
    </G>
  );
}

/** Lv.3~5 — 큰 몸 + 성장 왕관(떡잎/꽃봉오리/활짝 꽃). */
function GrownBody({ stage, mood }: { stage: SproutStage; mood: SproutMood }) {
  const dull = mood === 'sleepy';
  const leaf = dull ? C.dullLeaf : C.leaf;
  const leafAlt = dull ? C.dullLeafAlt : C.leafAlt;
  const leafDark = dull ? C.dullLeafDark : C.leafDark;
  const body = dull ? C.dullCream : C.cream;
  return (
    <G>
      <Rect x={75.5} y={38} width={9} height={32} rx={4.5} fill={leafDark} />
      {stage === 'bud' && <Bud />}
      {stage === 'bloom' && <Bloom />}
      <Path d="M80 54 C 63 56 46 45 44 25 C 61 23 78 33 82 54 Z" fill={leaf} stroke={leafDark} strokeWidth={2.4} />
      <Path d="M80 54 C 97 56 114 45 116 25 C 99 23 82 33 78 54 Z" fill={leafAlt} stroke={leafDark} strokeWidth={2.4} />
      <Ellipse cx={80} cy={115} rx={51} ry={55} fill={body} stroke={C.creamOutline} strokeWidth={3.4} />
      <Face mood={mood} cx={80} eyeY={114} mouthY={127} scale={1} />
    </G>
  );
}

function Bud() {
  return (
    <G>
      <Path
        d="M80 32 C 80 18 90 12 94 20 C 98 28 90 36 80 38 C 70 36 62 28 66 20 C 70 12 80 18 80 32 Z"
        fill={C.petal}
        stroke="#E58AA2"
        strokeWidth={2}
      />
      <Circle cx={80} cy={28} r={5} fill={C.petalCenter} />
    </G>
  );
}

function Bloom() {
  return (
    <G>
      <Ellipse cx={80} cy={12} rx={7} ry={10} fill={C.petal} />
      <Ellipse cx={96} cy={20} rx={7} ry={10} fill={C.petal} rotation={50} originX={96} originY={20} />
      <Ellipse cx={100} cy={36} rx={7} ry={10} fill={C.petalAlt} rotation={90} originX={100} originY={36} />
      <Ellipse cx={64} cy={20} rx={7} ry={10} fill={C.petalAlt} rotation={-50} originX={64} originY={20} />
      <Ellipse cx={60} cy={36} rx={7} ry={10} fill={C.petal} rotation={90} originX={60} originY={36} />
      <Circle cx={80} cy={26} r={9} fill={C.petalCenter} stroke={C.petalCenterOutline} strokeWidth={2} />
    </G>
  );
}

/** 표정 — 몸 중심 cx, 눈/입 기준 y, scale로 크기 보정. */
function Face({
  mood,
  cx,
  eyeY,
  mouthY,
  scale,
}: {
  mood: SproutMood;
  cx: number;
  eyeY: number;
  mouthY: number;
  scale: number;
}) {
  const dx = 15 * scale;
  const lx = cx - dx;
  const rx = cx + dx;
  const er = 5.8 * scale;
  const eh = 7.2 * scale;
  const blush = 9 * scale;

  if (mood === 'proud') {
    return (
      <G>
        <Ellipse cx={lx} cy={mouthY - 2} rx={blush} ry={5.6 * scale} fill="#F5A08C" opacity={0.7} />
        <Ellipse cx={rx} cy={mouthY - 2} rx={blush} ry={5.6 * scale} fill="#F5A08C" opacity={0.7} />
        <Path d={arc(lx, eyeY, 6 * scale, true)} stroke={C.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
        <Path d={arc(rx, eyeY, 6 * scale, true)} stroke={C.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
        <Path d={smile(cx, mouthY, 10 * scale, 11 * scale)} fill="#B0574B" />
        <Path d={sparkle(cx + 46 * scale, eyeY - 46 * scale, 5 * scale)} fill={C.spark} />
      </G>
    );
  }

  if (mood === 'cheer') {
    return (
      <G>
        <Ellipse cx={lx} cy={mouthY - 1} rx={blush} ry={5.4 * scale} fill={C.blush} opacity={0.55} />
        <Ellipse cx={rx} cy={mouthY - 1} rx={blush} ry={5.4 * scale} fill={C.blush} opacity={0.55} />
        <Ellipse cx={lx} cy={eyeY - 1} rx={er + 0.6} ry={eh + 0.6} fill={C.ink} />
        <Ellipse cx={rx} cy={eyeY - 1} rx={er + 0.6} ry={eh + 0.6} fill={C.ink} />
        <Circle cx={lx + 2.3} cy={eyeY - 4} r={2.2 * scale} fill="#fff" />
        <Circle cx={rx + 2.3} cy={eyeY - 4} r={2.2 * scale} fill="#fff" />
        <Ellipse cx={cx} cy={mouthY + 3} rx={7 * scale} ry={8 * scale} fill="#B0574B" />
      </G>
    );
  }

  if (mood === 'sleepy') {
    return (
      <G>
        <Ellipse cx={lx} cy={mouthY - 1} rx={blush - 0.5} ry={5 * scale} fill={C.blush} opacity={0.4} />
        <Ellipse cx={rx} cy={mouthY - 1} rx={blush - 0.5} ry={5 * scale} fill={C.blush} opacity={0.4} />
        <Path d={arc(lx, eyeY, 6 * scale, false)} stroke={C.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
        <Path d={arc(rx, eyeY, 6 * scale, false)} stroke={C.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
        <Path
          d={`M${cx - 8 * scale} ${mouthY + 4} Q ${cx} ${mouthY - 1} ${cx + 8 * scale} ${mouthY + 4}`}
          stroke={C.ink}
          strokeWidth={2.8}
          fill="none"
          strokeLinecap="round"
        />
        <SvgText x={cx + 34 * scale} y={eyeY - 24 * scale} fontSize={15 * scale} fontWeight="700" fill={C.dullLeafDark}>
          z
        </SvgText>
        <SvgText x={cx + 44 * scale} y={eyeY - 36 * scale} fontSize={11 * scale} fontWeight="700" fill={C.dullLeafAlt}>
          z
        </SvgText>
      </G>
    );
  }

  return (
    <G>
      <Ellipse cx={lx} cy={mouthY - 1} rx={blush} ry={5.4 * scale} fill={C.blush} opacity={0.55} />
      <Ellipse cx={rx} cy={mouthY - 1} rx={blush} ry={5.4 * scale} fill={C.blush} opacity={0.55} />
      <Ellipse cx={lx} cy={eyeY} rx={er} ry={eh} fill={C.ink} />
      <Ellipse cx={rx} cy={eyeY} rx={er} ry={eh} fill={C.ink} />
      <Circle cx={lx + 2} cy={eyeY - 3} r={1.9 * scale} fill="#fff" />
      <Circle cx={rx + 2} cy={eyeY - 3} r={1.9 * scale} fill="#fff" />
      <Path d={smile(cx, mouthY, 8 * scale, 9 * scale)} stroke={C.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
    </G>
  );
}

/** 위로 볼록(happy) 또는 아래로 볼록(sleepy)한 눈 아치. */
function arc(cx: number, cy: number, w: number, up: boolean): string {
  const dip = up ? -8 : 5;
  return `M${cx - w} ${cy} Q ${cx} ${cy + dip} ${cx + w} ${cy}`;
}

/** 웃는 입 곡선(테두리용). */
function smile(cx: number, cy: number, w: number, depth: number): string {
  return `M${cx - w} ${cy} Q ${cx} ${cy + depth} ${cx + w} ${cy}`;
}

/** 4각 반짝임. */
function sparkle(cx: number, cy: number, r: number): string {
  return `M${cx} ${cy - r} L${cx + r * 0.4} ${cy - r * 0.4} L${cx + r} ${cy} L${cx + r * 0.4} ${cy + r * 0.4} L${cx} ${cy + r} L${cx - r * 0.4} ${cy + r * 0.4} L${cx - r} ${cy} L${cx - r * 0.4} ${cy - r * 0.4} Z`;
}

export const Sprout = memo(SproutBase);
