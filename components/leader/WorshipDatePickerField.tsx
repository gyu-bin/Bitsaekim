import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WorshipMonthCalendar } from '@/components/leader/WorshipMonthCalendar';
import { Button } from '@/components/ui/Button';
import { shadow } from '@/constants/colors';
import { fontSize, typeface } from '@/constants/fonts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatWorshipDateIso } from '@/lib/worshipDate';
import { useThemeStore } from '@/stores/themeStore';

type Props = {
  value: Date;
  onChange: (d: Date) => void;
  disabled?: boolean;
};

/** 화면 중앙 모달 · 커스텀 월 달력(넓은 레이아웃, 좌우 화살표) */
export function WorshipDatePickerField({ value, onChange, disabled }: Props) {
  const c = useThemeColors();
  const isDark = useThemeStore((s) => s.isDark);
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);
  const gutter = 16;
  const winW = Dimensions.get('window').width;
  const innerMax = Math.min(440, winW - insets.left - insets.right - gutter * 2);

  return (
    <>
      <Button
        title={formatWorshipDateIso(value)}
        variant="outline"
        disabled={disabled}
        onPress={() => {
          if (disabled) return;
          setOpen(true);
        }}
      />

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View
          style={[
            styles.modalRoot,
            { paddingLeft: insets.left + gutter, paddingRight: insets.right + gutter },
          ]}
        >
          <Pressable style={[styles.backdrop, isDark && styles.backdropDark]} onPress={close} accessibilityLabel="닫기" />
          <View
            style={[
              styles.card,
              shadow.md,
              {
                backgroundColor: c.card,
                borderColor: c.border,
                maxWidth: innerMax,
                width: '100%',
              },
            ]}
          >
            <View style={[styles.ribbon, { backgroundColor: c.accent }]} />

            <View style={styles.header}>
              <View style={[styles.iconRing, { backgroundColor: c.accentLight, borderColor: c.accentDark }]}>
                <Feather name="calendar" size={22} color={c.accent} />
              </View>
              <Text style={[styles.title, { color: c.text }]}>날짜 선택</Text>
              <Text style={[styles.subtitle, { color: c.textSub }]}>{formatWorshipDateIso(value)}</Text>
            </View>

            {open && (
              <View style={[styles.pickerWrap, { borderTopColor: c.border }]}>
                <WorshipMonthCalendar
                  value={value}
                  onChange={(d) => {
                    onChange(d);
                    close();
                  }}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 22, 14, 0.48)',
  },
  backdropDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: 14,
  },
  ribbon: {
    height: 4,
    width: '100%',
    opacity: 0.95,
  },
  header: {
    alignItems: 'center',
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  iconRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 12,
  },
  title: {
    ...typeface.serifBold,
    fontSize: fontSize.xl,
    letterSpacing: -0.3,
  },
  subtitle: {
    ...typeface.mono,
    fontSize: fontSize.sm,
    marginTop: 6,
    letterSpacing: 1.2,
  },
  pickerWrap: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
