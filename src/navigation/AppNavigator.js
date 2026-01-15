import React, { useState, useEffect } from 'react';
import { AppState, View } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { isSetupComplete } from '../utils/storage';
import { isUserRegistered, isAppLockEnabled, isLoggedOut } from '../utils/auth';

// Unified Auth Screen
import AuthScreen from '../screens/AuthScreen';

// Setup Wizard
import SetupStep1SkinType from '../screens/setup/SetupStep1SkinType';
import SetupStep2Sunscreen from '../screens/setup/SetupStep2Sunscreen';
import SetupStep3Location from '../screens/setup/SetupStep3Location';
import SetupStep4Disclaimer from '../screens/setup/SetupStep4Disclaimer';

// Main App
import TabNavigator from './TabNavigator';
import OnboardingScreen from '../screens/OnboardingScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const { colors, isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [initialRoute, setInitialRoute] = useState('Auth');
    const navigationRef = useNavigationContainerRef();

    useEffect(() => {
        checkAppState();
    }, []);

    // App Lock Listener
    // App Lock Listener
    const lastBackgroundTime = React.useRef(Date.now()); // Initialize to NOW to prevent immediate lock on startup

    useEffect(() => {
        const subscription = AppState.addEventListener('change', async (nextAppState) => {
            if (nextAppState === 'background' || nextAppState === 'inactive') {
                lastBackgroundTime.current = Date.now();
            } else if (nextAppState === 'active') {
                const now = Date.now();
                const timeInBackground = now - lastBackgroundTime.current;

                // Grace period of 5 seconds (to allow Share/Permissions dialogs)
                if (timeInBackground < 5000) {
                    console.log('App Lock: Within grace period, skipping lock.');
                    return;
                }

                const locked = await isAppLockEnabled();
                if (locked && navigationRef.isReady()) {
                    // Navigate to Auth screen (acts as lock screen)
                    // We reset the stack to prevent going back
                    navigationRef.reset({
                        index: 0,
                        routes: [{ name: 'Auth' }],
                    });
                }
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const checkAppState = async () => {
        try {
            console.log('AppNavigator: Checking app state...');

            const registered = await isUserRegistered();
            const loggedOut = await isLoggedOut();
            console.log('AppNavigator: Registered:', registered, 'LoggedOut:', loggedOut);

            const setupDone = await isSetupComplete();
            console.log('AppNavigator: SetupDone:', setupDone);

            // Check if App Lock is enabled (initial launch)
            const locked = await isAppLockEnabled();

            if (locked) {
                setInitialRoute('Auth');
            } else if (registered && !loggedOut) { // Check if explicitly logged out
                if (setupDone) {
                    setInitialRoute('MainTabs');
                } else {
                    setInitialRoute('SetupStep1');
                }
            } else {
                setInitialRoute('Auth');
            }
        } catch (error) {
            console.error('AppNavigator: State check error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Navigation Theme based on context
    const navTheme = {
        dark: isDark,
        colors: {
            primary: colors.primary,
            background: colors.background,
            card: colors.cardBackground,
            text: colors.text,
            border: colors.border,
            notification: colors.accent,
        },
    };

    if (loading) {
        return null;
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <NavigationContainer ref={navigationRef} theme={navTheme}>
                <Stack.Navigator
                    initialRouteName={initialRoute}
                    screenOptions={{
                        contentStyle: { backgroundColor: colors.background }, // Prevent white flash
                        animation: 'slide_from_right', // Standardize animation
                        headerShown: false,
                        headerStyle: { backgroundColor: colors.cardBackground },
                        headerTintColor: colors.text,
                        headerTitleStyle: { fontWeight: 'bold' },
                    }}
                >
                    {/* UNIFIED AUTH SCREEN - Login/Register tabs */}
                    <Stack.Screen
                        name="Auth"
                        component={AuthScreen}
                        options={{ gestureEnabled: false }}
                    />

                    {/* SETUP WIZARD */}
                    <Stack.Screen
                        name="SetupStep1"
                        component={SetupStep1SkinType}
                        options={{ gestureEnabled: false }}
                    />
                    <Stack.Screen
                        name="SetupStep2"
                        component={SetupStep2Sunscreen}
                    />
                    <Stack.Screen
                        name="SetupStep3"
                        component={SetupStep3Location}
                    />
                    <Stack.Screen
                        name="SetupStep4"
                        component={SetupStep4Disclaimer}
                        options={{ gestureEnabled: false }}
                    />

                    {/* MAIN APP - Daily Dashboard */}
                    <Stack.Screen
                        name="MainTabs"
                        component={TabNavigator}
                    />

                    <Stack.Screen
                        name="History"
                        component={HistoryScreen}
                        options={{
                            headerShown: true,
                            headerTitle: 'History',
                            headerBackTitleVisible: false,
                        }}
                    />

                    <Stack.Screen
                        name="Settings"
                        component={SettingsScreen}
                        options={{
                            headerShown: true,
                            headerTitle: 'Settings',
                            headerBackTitleVisible: false,
                        }}
                    />

                    {/* Modal for changing skin type from Settings */}
                    <Stack.Screen
                        name="ChangeSkinType"
                        component={OnboardingScreen}
                        options={{
                            presentation: 'modal',
                            headerShown: true,
                            headerTitle: 'Change Skin Type',
                        }}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </View>
    );
}
