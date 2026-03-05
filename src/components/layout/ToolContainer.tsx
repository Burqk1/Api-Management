import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';

interface ToolContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
}

export const ToolContainer: React.FC<ToolContainerProps> = ({
  children,
  scroll = true,
}) => {
  const { colors } = useTheme();
  const isWeb = Platform.OS === 'web';

  const inner = (
    <View style={[styles.inner, isWeb && styles.innerWeb]}>
      {children}
    </View>
  );

  const content = scroll ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {inner}
    </ScrollView>
  ) : (
    <View style={[styles.scroll, styles.content]}>{inner}</View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    gap: 16,
  },
  innerWeb: {
    maxWidth: 700,
  },
});
