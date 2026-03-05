import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface SegmentedControlProps {
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selected,
  onSelect,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.systemGray5 : colors.systemGray6 }]}>
      {options.map((option) => {
        const isActive = option === selected;
        return (
          <TouchableOpacity
            key={option}
            onPress={() => onSelect(option)}
            style={[
              styles.option,
              isActive && [styles.activeOption, {
                backgroundColor: colors.surface,
                shadowColor: '#000',
              }],
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.label,
                { color: isActive ? colors.text : colors.textSecondary },
                isActive && styles.activeLabel,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 2,
  },
  option: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeOption: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.08,
  },
  activeLabel: {
    fontWeight: '600',
  },
});
