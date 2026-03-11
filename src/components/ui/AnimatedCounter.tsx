import React, { useEffect, useRef } from 'react';
import { Text, Animated, TextStyle } from 'react-native';

interface Props {
  value: number;
  suffix?: string;
  style?: TextStyle;
  duration?: number;
}

export const AnimatedCounter: React.FC<Props> = ({ value, suffix = '', style, duration = 800 }) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const displayRef = useRef(0);
  const textRef = useRef<Text>(null);

  useEffect(() => {
    animValue.setValue(0);
    const listener = animValue.addListener(({ value: v }) => {
      displayRef.current = Math.round(v);
      textRef.current?.setNativeProps({ text: `${displayRef.current}${suffix}` });
    });

    Animated.timing(animValue, {
      toValue: value,
      duration,
      useNativeDriver: false,
    }).start();

    return () => animValue.removeListener(listener);
  }, [value]);

  return (
    <Text ref={textRef} style={style}>
      {value}{suffix}
    </Text>
  );
};
