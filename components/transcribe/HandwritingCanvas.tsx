import { Feather } from '@expo/vector-icons';
import { Canvas, Group, ImageFormat, Path, Rect, useCanvasRef } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useThemeStore } from '@/stores/themeStore';
import type { TranscriptionWorkCaptureHandle } from '@/types';

type Pt = { x: number; y: number };

type StrokeTool = 'pen' | 'eraser';

type Stroke = {
  id: number;
  d: string;
  tool: StrokeTool;
  color: string;
  strokeWidth: number;
};

type LiveStroke = {
  d: string;
  tool: StrokeTool;
  color: string;
  strokeWidth: number;
};

function strokeToSvgD(pts: Pt[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) {
    const { x, y } = pts[0];
    return `M ${x} ${y} L ${x + 0.5} ${y}`;
  }
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].x} ${pts[i].y}`;
  }
  return d;
}

/** Catmull–Rom 스타일 부드러운 필기 (굿노트류 앱과 유사한 곡선) */
function pointsToSmoothPath(pts: Pt[], tension = 0.35): string {
  if (pts.length === 0) return '';
  if (pts.length <= 2) return strokeToSvgD(pts);
  const n = pts.length;
  const d: string[] = [`M ${pts[0].x} ${pts[0].y}`];
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;
    d.push(`C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`);
  }
  return d.join(' ');
}

const LINE_GAP = 34;
const MARGIN_X = 44;

const PEN_WIDTHS = [
  { key: 's', label: '가늘게', w: 1.8 },
  { key: 'm', label: '보통', w: 3.2 },
  { key: 'l', label: '굵게', w: 5.5 },
  { key: 'xl', label: '아주 굵게', w: 9 },
] as const;

const PEN_COLORS = [
  { key: 'black', label: '검정', color: '#1a160e' },
  { key: 'blue', label: '파랑', color: '#1e4a8c' },
  { key: 'red', label: '빨강', color: '#b22222' },
  { key: 'green', label: '초록', color: '#1a6b3a' },
  { key: 'violet', label: '보라', color: '#5c3d8c' },
  { key: 'gold', label: '골드', color: '#b8935a' },
] as const;

const ERASER_WIDTH_MUL = 5.2;

function ruledLinesPath(w: number, h: number): string {
  let d = '';
  for (let y = LINE_GAP; y < h + LINE_GAP; y += LINE_GAP) {
    d += `M 0 ${y} L ${w} ${y} `;
  }
  return d.trim();
}

type InkState = { strokes: Stroke[]; redo: Stroke[] };

type Props = {
  /** 절이 바뀔 때마다 필기 초기화 */
  verseKey: string;
};

/**
 * @shopify/react-native-skia + react-native-gesture-handler (공식 권장).
 * Skia Canvas의 RN onTouch는 iPad/펜슬에서 누락되는 경우가 있어 Pan 제스처로 좌표를 받습니다.
 * 웹은 Skia 별도 설정이 필요해 타이핑 유도.
 */
export const HandwritingCanvas = forwardRef<TranscriptionWorkCaptureHandle, Props>(function HandwritingCanvas(
  { verseKey },
  ref
) {
  const c = useThemeColors();
  const isDark = useThemeStore((s) => s.isDark);
  const skiaRef = useCanvasRef();
  const inkStrokeCountRef = useRef(0);
  const [ink, setInk] = useState<InkState>({ strokes: [], redo: [] });
  const [live, setLive] = useState<LiveStroke | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 1, h: 1 });
  const pointsRef = useRef<Pt[]>([]);
  const strokeIdRef = useRef(0);
  const liveToolRef = useRef<StrokeTool>('pen');

  const [tool, setTool] = useState<StrokeTool>('pen');
  const [penColor, setPenColor] = useState<string>(PEN_COLORS[0].color);
  const [penWidthKey, setPenWidthKey] = useState<(typeof PEN_WIDTHS)[number]['key']>('m');
  const penWidth = PEN_WIDTHS.find((p) => p.key === penWidthKey)?.w ?? 3.2;

  const strokeInProgressRef = useRef(false);

  const paper = useMemo(
    () =>
      isDark
        ? { fill: '#16120c', line: '#2a3342', margin: '#5a3838', lineOpacity: 0.55 }
        : { fill: '#fdfbf5', line: '#9eb0cc', margin: '#d48888', lineOpacity: 0.65 },
    [isDark]
  );

  const clearAll = useCallback(() => {
    pointsRef.current = [];
    setLive(null);
    setInk({ strokes: [], redo: [] });
    strokeIdRef.current = 0;
  }, []);

  const undo = useCallback(() => {
    setInk(({ strokes, redo }) => {
      if (strokes.length === 0) return { strokes, redo };
      const last = strokes[strokes.length - 1];
      return { strokes: strokes.slice(0, -1), redo: [...redo, last] };
    });
  }, []);

  const redo = useCallback(() => {
    setInk(({ strokes, redo }) => {
      if (redo.length === 0) return { strokes, redo };
      const stroke = redo[redo.length - 1];
      return { strokes: [...strokes, stroke], redo: redo.slice(0, -1) };
    });
  }, []);

  useEffect(() => {
    clearAll();
  }, [verseKey, clearAll]);

  useEffect(() => {
    inkStrokeCountRef.current = ink.strokes.length;
  }, [ink.strokes.length]);

  useImperativeHandle(ref, () => ({
    async captureToTempJpeg(): Promise<string | null> {
      if (Platform.OS === 'web') return null;
      if (inkStrokeCountRef.current === 0) return null;
      const dir = FileSystem.cacheDirectory;
      if (!dir) return null;
      const cvs = skiaRef.current;
      if (!cvs) return null;
      try {
        const snapshot = await cvs.makeImageSnapshotAsync();
        if (!snapshot) return null;
        const base64 = snapshot.encodeToBase64(ImageFormat.JPEG, 88);
        snapshot.dispose();
        const path = `${dir}transcribe-hw-${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(path, base64, { encoding: 'base64' });
        return path;
      } catch {
        return null;
      }
    },
  }));

  const startStroke = useCallback(
    (x: number, y: number) => {
      liveToolRef.current = tool;
      pointsRef.current = [{ x, y }];
      const t = tool;
      const w = penWidth;
      const col = penColor;
      const d = strokeToSvgD(pointsRef.current);
      setLive({ d, tool: t, color: col, strokeWidth: w });
    },
    [tool, penWidth, penColor]
  );

  const appendPoint = useCallback((x: number, y: number) => {
    const pts = pointsRef.current;
    const last = pts[pts.length - 1];
    if (last && Math.hypot(x - last.x, y - last.y) < 0.8) return;
    pts.push({ x, y });
    const t = liveToolRef.current;
    const d = t === 'pen' ? pointsToSmoothPath(pts) : strokeToSvgD(pts);
    setLive((prev) => (prev ? { ...prev, d } : null));
  }, []);

  const endStroke = useCallback(() => {
    const pts = pointsRef.current;
    const t = liveToolRef.current;
    pointsRef.current = [];
    setLive(null);

    let d = '';
    if (t === 'pen') {
      if (pts.length < 2) return;
      d = pointsToSmoothPath(pts);
    } else {
      if (pts.length === 0) return;
      if (pts.length === 1) {
        d = strokeToSvgD([pts[0], { x: pts[0].x + 1.2, y: pts[0].y + 1.2 }]);
      } else {
        d = strokeToSvgD(pts);
      }
    }

    strokeIdRef.current += 1;
    const id = strokeIdRef.current;
    const stroke: Stroke = {
      id,
      d,
      tool: t,
      color: penColor,
      strokeWidth: penWidth,
    };
    setInk(({ strokes }) => ({ strokes: [...strokes, stroke], redo: [] }));
  }, [penColor, penWidth]);

  const handlersRef = useRef({ startStroke, appendPoint, endStroke });
  handlersRef.current = { startStroke, appendPoint, endStroke };

  const beginDraw = useCallback((x: number, y: number) => {
    strokeInProgressRef.current = true;
    handlersRef.current.startStroke(x, y);
  }, []);

  const moveDraw = useCallback((x: number, y: number) => {
    if (!strokeInProgressRef.current) return;
    handlersRef.current.appendPoint(x, y);
  }, []);

  const endDraw = useCallback(() => {
    if (!strokeInProgressRef.current) return;
    handlersRef.current.endStroke();
    strokeInProgressRef.current = false;
  }, []);

  const drawGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .maxPointers(1)
        .onStart((e) => {
          'worklet';
          runOnJS(beginDraw)(e.x, e.y);
        })
        .onUpdate((e) => {
          'worklet';
          runOnJS(moveDraw)(e.x, e.y);
        })
        .onFinalize(() => {
          'worklet';
          runOnJS(endDraw)();
        }),
    [beginDraw, moveDraw, endDraw]
  );

  const onCanvasLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setCanvasSize({ w: width, h: height });
    }
  }, []);

  const ruledD = useMemo(
    () => ruledLinesPath(canvasSize.w, canvasSize.h),
    [canvasSize.w, canvasSize.h]
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.box, { borderColor: c.border, backgroundColor: c.card }]}>
        <Text style={[styles.fallback, { color: c.textSub }]}>
          웹에서는 손글씨(Skia) 대신 타이핑 모드를 이용해 주세요.
        </Text>
      </View>
    );
  }

  const canUndo = ink.strokes.length > 0;
  const canRedo = ink.redo.length > 0;

  const vBar = (key: string) => (
    <View key={key} style={[styles.toolbarSep, { backgroundColor: c.border }]} />
  );

  return (
    <View style={[styles.wrap, { borderColor: c.border, backgroundColor: c.card }]}>
      <View style={[styles.topToolbar, { borderBottomColor: c.border, backgroundColor: c.background }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.topToolbarScroll}
        >
          <Pressable
            onPress={() => setTool('pen')}
            style={({ pressed }) => [
              styles.tbIconBtn,
              {
                borderColor: tool === 'pen' ? c.accent : c.border,
                backgroundColor: tool === 'pen' ? c.accentLight : c.card,
              },
              pressed && styles.pressed,
            ]}
            accessibilityLabel="펜"
            accessibilityState={{ selected: tool === 'pen' }}
          >
            <Feather name="edit-3" size={20} color={tool === 'pen' ? c.accentDark : c.textSub} />
          </Pressable>
          <Pressable
            onPress={() => setTool('eraser')}
            style={({ pressed }) => [
              styles.tbIconBtn,
              {
                borderColor: tool === 'eraser' ? c.accent : c.border,
                backgroundColor: tool === 'eraser' ? c.accentLight : c.card,
              },
              pressed && styles.pressed,
            ]}
            accessibilityLabel="지우개"
            accessibilityState={{ selected: tool === 'eraser' }}
          >
            <Feather name="slash" size={20} color={tool === 'eraser' ? c.accentDark : c.textSub} />
          </Pressable>

          {vBar('s1')}
          {PEN_WIDTHS.map((opt) => (
            <Pressable
              key={opt.key}
              onPress={() => setPenWidthKey(opt.key)}
              style={({ pressed }) => [
                styles.tbWidthBtn,
                {
                  borderColor: penWidthKey === opt.key ? c.accent : c.border,
                  backgroundColor: penWidthKey === opt.key ? c.accentLight : c.card,
                },
                pressed && styles.pressed,
              ]}
              accessibilityLabel={opt.label}
            >
              <View
                style={[
                  styles.tbWidthDot,
                  {
                    width: 4 + opt.w * 0.85,
                    height: 4 + opt.w * 0.85,
                    borderRadius: 99,
                    backgroundColor: tool === 'eraser' ? c.textSub : penColor,
                  },
                ]}
              />
            </Pressable>
          ))}

          {vBar('s2')}
          {PEN_COLORS.map((p) => (
            <Pressable
              key={p.key}
              onPress={() => {
                setTool('pen');
                setPenColor(p.color);
              }}
              style={({ pressed }) => [
                styles.tbSwatch,
                {
                  borderColor: penColor === p.color && tool === 'pen' ? c.accent : c.border,
                  backgroundColor: p.color,
                  opacity: tool === 'eraser' ? 0.55 : 1,
                },
                pressed && styles.pressed,
              ]}
              accessibilityLabel={p.label}
            />
          ))}

          {vBar('s3')}
          <Pressable
            onPress={undo}
            disabled={!canUndo}
            style={({ pressed }) => [
              styles.tbIconBtn,
              { borderColor: c.border, backgroundColor: c.card },
              pressed && canUndo && styles.pressed,
              !canUndo && styles.disabled,
            ]}
            accessibilityLabel="되돌리기"
          >
            <Feather name="rotate-ccw" size={20} color={canUndo ? c.accent : c.textSub} />
          </Pressable>
          <Pressable
            onPress={redo}
            disabled={!canRedo}
            style={({ pressed }) => [
              styles.tbIconBtn,
              { borderColor: c.border, backgroundColor: c.card },
              pressed && canRedo && styles.pressed,
              !canRedo && styles.disabled,
            ]}
            accessibilityLabel="다시 실행"
          >
            <Feather name="rotate-cw" size={20} color={canRedo ? c.text : c.textSub} />
          </Pressable>
          <Pressable
            onPress={clearAll}
            style={({ pressed }) => [
              styles.tbIconBtn,
              { borderColor: c.border, backgroundColor: c.card },
              pressed && styles.pressed,
            ]}
            accessibilityLabel="전부 지우기"
          >
            <Feather name="trash-2" size={20} color={c.textSub} />
          </Pressable>
        </ScrollView>
      </View>

      <View style={styles.canvasHost}>
        <View style={styles.drawSurface} onLayout={onCanvasLayout} collapsable={false}>
          <GestureDetector gesture={drawGesture}>
            <Canvas ref={skiaRef} style={{ width: canvasSize.w, height: canvasSize.h }}>
              <Rect x={0} y={0} width={canvasSize.w} height={canvasSize.h} color={paper.fill} />
              {ruledD.length > 0 ? (
                <Path
                  path={ruledD}
                  style="stroke"
                  strokeWidth={1}
                  color={paper.line}
                  opacity={paper.lineOpacity}
                  strokeCap="square"
                />
              ) : null}
              <Path
                path={`M ${MARGIN_X} 0 L ${MARGIN_X} ${canvasSize.h}`}
                style="stroke"
                strokeWidth={1.2}
                color={paper.margin}
                opacity={0.85}
              />

              <Group layer>
                {ink.strokes.map((s) =>
                  s.tool === 'eraser' ? (
                    <Path
                      key={s.id}
                      path={s.d}
                      style="stroke"
                      strokeWidth={s.strokeWidth * ERASER_WIDTH_MUL}
                      color="#ffffffff"
                      blendMode="clear"
                      strokeJoin="round"
                      strokeCap="round"
                    />
                  ) : (
                    <Path
                      key={s.id}
                      path={s.d}
                      style="stroke"
                      strokeWidth={s.strokeWidth}
                      color={s.color}
                      strokeJoin="round"
                      strokeCap="round"
                    />
                  )
                )}
                {live ? (
                  live.tool === 'eraser' ? (
                    <Path
                      path={live.d}
                      style="stroke"
                      strokeWidth={live.strokeWidth * ERASER_WIDTH_MUL}
                      color="#ffffffff"
                      blendMode="clear"
                      strokeJoin="round"
                      strokeCap="round"
                    />
                  ) : (
                    <Path
                      path={live.d}
                      style="stroke"
                      strokeWidth={live.strokeWidth}
                      color={live.color}
                      strokeJoin="round"
                      strokeCap="round"
                    />
                  )
                ) : null}
              </Group>
            </Canvas>
          </GestureDetector>
        </View>
      </View>
    </View>
  );
});

HandwritingCanvas.displayName = 'HandwritingCanvas';

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 220,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  topToolbar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexGrow: 0,
    flexShrink: 0,
  },
  topToolbarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minHeight: 48,
  },
  tbIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tbWidthBtn: {
    width: 38,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tbWidthDot: {},
  tbSwatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
  },
  toolbarSep: {
    width: 1,
    height: 26,
    alignSelf: 'center',
    marginHorizontal: 4,
  },
  canvasHost: { flex: 1, minHeight: 200, position: 'relative' },
  drawSurface: { flex: 1, minHeight: 200 },
  box: {
    minHeight: 200,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'center',
  },
  fallback: { ...typeface.sans, fontSize: fontSize.sm, textAlign: 'center' },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.4 },
});
