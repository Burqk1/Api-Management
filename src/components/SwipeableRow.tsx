import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface SwipeAction {
  icon: string;
  color: string;
  bgColor: string;
  onPress: () => void;
  label?: string;
}

interface Props {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
}

const SWIPE_THRESHOLD = 60;
const ACTION_WIDTH = 70;

export default function SwipeableRow({ children, leftActions = [], rightActions = [] }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        const maxLeft = leftActions.length * ACTION_WIDTH;
        const maxRight = -(rightActions.length * ACTION_WIDTH);
        const newVal = Math.max(maxRight, Math.min(maxLeft, gesture.dx + lastOffset.current));
        translateX.setValue(newVal);
      },
      onPanResponderRelease: (_, gesture) => {
        const maxLeft = leftActions.length * ACTION_WIDTH;
        const maxRight = -(rightActions.length * ACTION_WIDTH);

        let toValue = 0;
        if (gesture.dx > SWIPE_THRESHOLD && leftActions.length > 0) {
          toValue = maxLeft;
        } else if (gesture.dx < -SWIPE_THRESHOLD && rightActions.length > 0) {
          toValue = maxRight;
        }

        lastOffset.current = toValue;
        Animated.spring(translateX, {
          toValue,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }).start();
      },
    })
  ).current;

  const close = () => {
    lastOffset.current = 0;
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  };

  return (
    <View style={styles.container}>
      {/* Left actions (behind content, shown when swiped right) */}
      {leftActions.length > 0 && (
        <View style={[styles.actionsLeft, { width: leftActions.length * ACTION_WIDTH }]}>
          {leftActions.map((action, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.actionBtn, { backgroundColor: action.bgColor }]}
              onPress={() => { action.onPress(); close(); }}
            >
              <MaterialCommunityIcons name={action.icon as any} size={20} color={action.color} />
              {action.label && <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Right actions */}
      {rightActions.length > 0 && (
        <View style={[styles.actionsRight, { width: rightActions.length * ACTION_WIDTH }]}>
          {rightActions.map((action, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.actionBtn, { backgroundColor: action.bgColor }]}
              onPress={() => { action.onPress(); close(); }}
            >
              <MaterialCommunityIcons name={action.icon as any} size={20} color={action.color} />
              {action.label && <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', overflow: 'hidden' },
  actionsLeft: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    flexDirection: 'row',
  },
  actionsRight: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    flexDirection: 'row',
  },
  actionBtn: {
    width: ACTION_WIDTH, justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  actionLabel: { fontSize: 10, fontWeight: '600' },
});
