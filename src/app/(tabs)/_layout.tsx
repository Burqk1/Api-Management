import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';

export default function TabLayout() {
  const colors = useThemeStore((s) => s.colors);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 0.33,
          height: Platform.OS === 'ios' ? 88 : 65,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          letterSpacing: 0.1,
        },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
          letterSpacing: -0.4,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="apis"
        options={{
          title: 'APIs',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="api" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="monitor"
        options={{
          title: 'Monitor',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="heart-pulse" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: 'Tools',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="toolbox-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
