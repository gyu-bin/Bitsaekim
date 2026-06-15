import React from 'react';
import type { CSSProperties } from 'react';

import { radius } from '@/constants/colors';

export type WebNativeTextInputProps = {
  textRef: React.MutableRefObject<string>;
  onTextChange: () => void;
  placeholder: string;
  autoCapitalize?: 'none' | 'sentences' | 'characters';
};

const baseStyle: CSSProperties = {
  alignSelf: 'stretch',
  width: '100%',
  boxSizing: 'border-box',
  minHeight: 52,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'rgba(255,255,255,0.35)',
  borderRadius: radius.lg,
  backgroundColor: 'rgba(255,255,255,0.08)',
  paddingLeft: 16,
  paddingRight: 16,
  paddingTop: 14,
  paddingBottom: 14,
  fontSize: 17,
  color: '#fff',
  marginBottom: 16,
  outline: 'none',
};

/** Expo Web: RN TextInput 한글 조합 깨짐 회피용 브라우저 네이티브 input */
export function WebNativeTextInput({
  textRef,
  onTextChange,
  placeholder,
  autoCapitalize = 'none',
}: WebNativeTextInputProps) {
  return React.createElement('input', {
    type: 'text',
    lang: 'ko',
    autoComplete: 'off',
    spellCheck: false,
    placeholder,
    defaultValue: '',
    style: {
      ...baseStyle,
      textTransform: autoCapitalize === 'characters' ? 'uppercase' : undefined,
    },
    onInput: (e: React.FormEvent<HTMLInputElement>) => {
      let text = e.currentTarget.value;
      if (autoCapitalize === 'characters') {
        text = text.toUpperCase().replace(/\s/g, '');
        e.currentTarget.value = text;
      }
      textRef.current = text;
      onTextChange();
    },
  });
}
