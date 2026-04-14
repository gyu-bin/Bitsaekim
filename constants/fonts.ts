import { Platform } from 'react-native';

export const fonts = {
  serif: 'NotoSerifKR_400Regular',
  serifBold: 'NotoSerifKR_700Bold',
  sans: 'NotoSansKR_400Regular',
  sansMedium: 'NotoSansKR_500Medium',
  mono: 'DMMono_400Regular',
} as const;

/**
 * RN에서 커스텀 TTF는 파일마다 이미 굵기가 정해져 있음.
 * Android(특히)·iOS에서 `fontFamily`와 숫자 `fontWeight`가 겹치거나 부모에서 bold가 내려오면
 * 한글 조합·글리프가 깨지는 경우가 많아, 커스텀 폰트를 쓸 때는 `fontWeight: 'normal'`을 고정한다.
 */
const weightNormalize =
  Platform.OS === 'ios' || Platform.OS === 'android'
    ? ({ fontWeight: 'normal' as const })
    : ({} as Record<string, never>);

/** Text / TextInput 스타일에 spread: `{ ...typeface.sans, fontSize: 14 }` */
export const typeface = {
  sans: { fontFamily: fonts.sans, ...weightNormalize },
  sansMedium: { fontFamily: fonts.sansMedium, ...weightNormalize },
  serif: { fontFamily: fonts.serif, ...weightNormalize },
  serifBold: { fontFamily: fonts.serifBold, ...weightNormalize },
  mono: { fontFamily: fonts.mono, ...weightNormalize },
} as const;

export const fontSize = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 36,
  '4xl': 48,
} as const;
