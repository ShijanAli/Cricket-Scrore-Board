import { Text as RNText, type TextProps } from 'react-native';
import { colors, font } from './theme';

type Variant = 'body' | 'muted' | 'label' | 'title' | 'heading' | 'score' | 'error';

const styles = {
  body: { fontSize: font.md, color: colors.text },
  muted: { fontSize: font.sm, color: colors.muted },
  label: { fontSize: font.sm, color: colors.text, fontWeight: '600' },
  title: { fontSize: font.lg, color: colors.text, fontWeight: '700' },
  heading: { fontSize: font.xl, color: colors.text, fontWeight: '800' },
  score: { fontSize: font.score, color: colors.text, fontWeight: '800' },
  error: { fontSize: font.sm, color: colors.danger },
} as const;

export interface AppTextProps extends TextProps {
  variant?: Variant;
}

export function Text({ variant = 'body', style, ...rest }: AppTextProps) {
  return <RNText {...rest} style={[styles[variant], style]} />;
}
