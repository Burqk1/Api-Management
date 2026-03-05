import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { useLanguageStore } from '../stores/languageStore';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  icon: string;
  color: string;
  titleKey: string;
  descKey: string;
}

const SLIDES: OnboardingSlide[] = [
  { icon: 'api', color: '#58A6FF', titleKey: 'onboardWelcomeTitle', descKey: 'onboardWelcomeDesc' },
  { icon: 'send', color: '#3FB950', titleKey: 'onboardRequestTitle', descKey: 'onboardRequestDesc' },
  { icon: 'heart-pulse', color: '#FF6961', titleKey: 'onboardMonitorTitle', descKey: 'onboardMonitorDesc' },
  { icon: 'chart-bar', color: '#BC8CFF', titleKey: 'onboardAnalyticsTitle', descKey: 'onboardAnalyticsDesc' },
  { icon: 'toolbox-outline', color: '#D29922', titleKey: 'onboardToolsTitle', descKey: 'onboardToolsDesc' },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const finish = async () => {
    await AsyncStorage.setItem('onboarding_done', 'true');
    router.back();
  };

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      finish();
    }
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.iconCircle, { backgroundColor: item.color + '18' }]}>
        <MaterialCommunityIcons name={item.icon as any} size={64} color={item.color} />
      </View>
      <Text style={[styles.slideTitle, { color: colors.text }]}>{t(item.titleKey)}</Text>
      <Text style={[styles.slideDesc, { color: colors.textSecondary }]}>{t(item.descKey)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.skipRow}>
        <TouchableOpacity onPress={finish}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>{t('skip')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(idx);
        }}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 24, 8], extrapolate: 'clamp' });
          const opacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { width: dotWidth, opacity, backgroundColor: colors.primary }]}
            />
          );
        })}
      </View>

      <View style={styles.bottomRow}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.primary }]}
          onPress={goNext}
        >
          <Text style={styles.nextText}>
            {currentIndex === SLIDES.length - 1 ? t('getStarted') : t('next')}
          </Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  skipRow: { alignItems: 'flex-end', paddingHorizontal: 24, paddingTop: 8 },
  skipText: { fontSize: 15, fontWeight: '600' },
  slide: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40,
  },
  iconCircle: {
    width: 140, height: 140, borderRadius: 70,
    alignItems: 'center', justifyContent: 'center', marginBottom: 32,
  },
  slideTitle: { fontSize: 28, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5, marginBottom: 12 },
  slideDesc: { fontSize: 16, textAlign: 'center', lineHeight: 24, letterSpacing: -0.2 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 24 },
  dot: { height: 8, borderRadius: 4 },
  bottomRow: { paddingHorizontal: 24, paddingBottom: 20 },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 14,
  },
  nextText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
