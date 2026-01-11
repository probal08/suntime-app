import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { COLORS, moderateScale } from '../constants/theme';
import { Sun, History, LineChart, BookOpen, Settings } from 'lucide-react-native';

// Screens
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProgressScreen from '../screens/ProgressScreen';
import LearnScreen from '../screens/LearnScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textSecondary,
                tabBarStyle: {
                    backgroundColor: COLORS.cardBackground,
                    borderTopColor: COLORS.border,
                    borderTopWidth: 1,
                    paddingTop: moderateScale(8),
                    paddingBottom: moderateScale(8),
                    height: moderateScale(65),
                },
                tabBarLabelStyle: {
                    fontSize: moderateScale(11),
                    fontWeight: '600',
                },
                headerShown: false,
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Sun color={color} size={moderateScale(24)} />,
                }}
            />
            <Tab.Screen
                name="History"
                component={HistoryScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <History color={color} size={moderateScale(24)} />,
                }}
            />
            <Tab.Screen
                name="Progress"
                component={ProgressScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <LineChart color={color} size={moderateScale(24)} />,
                }}
            />
            <Tab.Screen
                name="Learn"
                component={LearnScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <BookOpen color={color} size={moderateScale(24)} />,
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Settings color={color} size={moderateScale(24)} />,
                }}
            />
        </Tab.Navigator>
    );
}
