import React from 'react';
import { AppState, View } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { isAppLockEnabled } from '../utils/auth';
import LoadingScreen from '../components/LoadingScreen';

// Unified Auth Screen
import AuthScreen from '../screens/AuthScreen';

// Setup Wizard
import SetupStep1SkinType from '../screens/setup/SetupStep1SkinType';
import SetupStep2Sunscreen from '../screens/setup/SetupStep2Sunscreen';
import SetupStep3Location from '../screens/setup/SetupStep3Location';
import SetupStepVitaminD from '../screens/setup/SetupStepVitaminD';
import SetupStepPrescription from '../screens/setup/SetupStepPrescription';
import SetupStep4Disclaimer from '../screens/setup/SetupStep4Disclaimer';

// Skin Scanner Screen
import SkinScannerScreen from '../screens/SkinScannerScreen';

// Main App
import TabNavigator from './TabNavigator';
import OnboardingScreen from '../screens/OnboardingScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const { colors, isDark } = useTheme();
    // Use 'loading' from AuthContext to determine if we are in the middle of a login/fetch
    const { user, initializing, isAuthenticated, userProfile, loading } = useAuth();
    const navigationRef = useNavigationContainerRef();

    // App Lock Listener Logic
    const lastBackgroundTime = React.useRef(Date.now());

    React.useEffect(() => {
        const subscription = AppState.addEventListener('change', async (nextAppState) => {
            if (nextAppState === 'background' || nextAppState === 'inactive') {
                lastBackgroundTime.current = Date.now();
            } else if (nextAppState === 'active') {
                const now = Date.now();
                const timeInBackground = now - lastBackgroundTime.current;

                // Grace period of 5 seconds
                if (timeInBackground < 5000) {
                    return;
                }

                const locked = await isAppLockEnabled();
                if (locked && navigationRef.isReady() && !isAuthenticated) {
                    // Navigate to Auth screen only if not authenticated
                    // With conditional rendering, this might be redundant if isAuthenticated is false
                    // but keeping for explicit lock check logic
                }
            }
        });

        return () => {
            subscription.remove();
        };
    }, [isAuthenticated]);

    // Derived State for Validation
    // Check if setup is truly complete (flag + critical data existence)
    const hasSkinType = userProfile?.skinType !== undefined && userProfile?.skinType !== null;
    const completedFlag = userProfile?.setupCompleted === true;

    // Auto-repair logic can be done in a useEffect, but for rendering decision we use this:
    const isSetupComplete = completedFlag && hasSkinType;

    // Navigation Theme
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

    // Show Loading only when initializing OR specifically loading auth data
    if (initializing || loading) {
        return <LoadingScreen message="Starting Suntime..." />;
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <NavigationContainer ref={navigationRef} theme={navTheme}>
                <Stack.Navigator
                    screenOptions={{
                        contentStyle: { backgroundColor: colors.background },
                        animation: 'slide_from_right',
                        headerShown: false,
                        headerStyle: { backgroundColor: colors.cardBackground },
                        headerTintColor: colors.text,
                        headerTitleStyle: { fontWeight: 'bold' },
                    }}
                >
                    {!isAuthenticated ? (
                        // ---------------------------------------------------------
                        // AUTHENTICATION STACK
                        // ---------------------------------------------------------
                        <Stack.Screen
                            name="Auth"
                            component={AuthScreen}
                            options={{ gestureEnabled: false }}
                        />
                    ) : !isSetupComplete ? (
                        // ---------------------------------------------------------
                        // SETUP WIZARD STACK
                        // ---------------------------------------------------------
                        <Stack.Group>
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
                                name="SetupStepVitaminD"
                                component={SetupStepVitaminD}
                            />
                            <Stack.Screen
                                name="SetupStepPrescription"
                                component={SetupStepPrescription}
                            />
                            <Stack.Screen
                                name="SetupStep4"
                                component={SetupStep4Disclaimer}
                                options={{ gestureEnabled: false }}
                            />
                        </Stack.Group>
                    ) : (
                        // ---------------------------------------------------------
                        // MAIN APP STACK
                        // ---------------------------------------------------------
                        <Stack.Group>
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
                            <Stack.Screen
                                name="ChangeSkinType"
                                component={OnboardingScreen}
                                options={{
                                    presentation: 'modal',
                                    headerShown: true,
                                    headerTitle: 'Change Skin Type',
                                }}
                            />
                        </Stack.Group>
                    )}

                    {/* ---------------------------------------------------------
                        SHARED SCREENS (Accessible from Setup or Main)
                        --------------------------------------------------------- */}
                    <Stack.Screen
                        name="SkinScanner"
                        component={SkinScannerScreen}
                        options={{
                            headerShown: true,
                            headerTitle: 'Scan Skin Type',
                            headerBackTitleVisible: false,
                        }}
                    />

                </Stack.Navigator>
            </NavigationContainer>
        </View>
    );
}
