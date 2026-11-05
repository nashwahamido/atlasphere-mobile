import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { colors, radius } from '@/lib/theme';

type Props = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: 'primary' | 'secondary' | 'outlineLight' | 'link';
  loading?: boolean;
};

export function Button({ title, variant = 'primary', loading, disabled, style, ...rest }: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        styles[variant],
        state.pressed && variant === 'primary' ? { backgroundColor: colors.orangePressed } : null,
        state.pressed && variant !== 'primary' ? { opacity: 0.7 } : null,
        isDisabled ? { opacity: 0.6 } : null,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'outlineLight' ? colors.white : colors.navy} />
      ) : (
        <Text style={[styles.text, textStyles[variant]]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  primary: { backgroundColor: colors.orange },
  secondary: { backgroundColor: colors.field, borderWidth: 1, borderColor: colors.border },
  outlineLight: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)' },
  link: { minHeight: 40, paddingHorizontal: 8 },
  text: { fontSize: 16, fontWeight: '700' },
});

const textStyles = StyleSheet.create({
  primary: { color: colors.white },
  secondary: { color: colors.navy },
  outlineLight: { color: colors.white },
  link: { color: colors.blue, fontWeight: '600' },
});
