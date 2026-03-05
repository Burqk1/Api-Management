import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface CopyButtonProps {
  text: string;
  label?: string;
  size?: number;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label = 'Copy',
  size = 20,
}) => {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TouchableOpacity
      onPress={handleCopy}
      style={[styles.btn, { backgroundColor: copied ? colors.secondaryLight : colors.surface }]}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons
        name={copied ? 'check' : 'content-copy'}
        size={size - 4}
        color={copied ? colors.secondary : colors.textSecondary}
      />
      <Text
        style={[
          styles.label,
          { color: copied ? colors.secondary : colors.textSecondary },
        ]}
      >
        {copied ? 'Copied!' : label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
});
