import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    InteractionManager,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    FadeIn,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    withSpring,
    withSequence
} from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale } from '../constants/theme';
import {
    saveCredentials,
    verifyPassword,
    getUsername,
    authenticateWithBiometric,
    checkBiometricAvailable,
    isBiometricEnabled,
    isUserRegistered,
} from '../utils/auth';

export default function AuthScreen({ navigation }) {
    const [mode, setMode] = useState('login'); // 'login' or 'register'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [enableBiometric, setEnableBiometric] = useState(false);
    const [loading, setLoading] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [hasAccount, setHasAccount] = useState(false);

    // Animation values
    const sunRotation = useSharedValue(0);

    useEffect(() => {
        checkInitialState();

        // Delay animation start to ensure Reanimated runtime is ready
        // Use InteractionManager to ensure native interactions are complete
        const task = InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => {
                try {
                    sunRotation.value = withRepeat(
                        withTiming(360, { duration: 10000 }),
                        -1, // infinite
                        false
                    );
                } catch (error) {
                    console.error('Animation initialization error:', error);
                }
            });
        });

        return () => task.cancel();
    }, []);

    const animatedSunStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${sunRotation.value}deg` }],
    }));

    const checkInitialState = async () => {
        const registered = await isUserRegistered();
        setHasAccount(registered);
        setMode(registered ? 'login' : 'register');

        if (registered) {
            const storedUsername = await getUsername();
            if (storedUsername) {
                setUsername(storedUsername);
            }
        }

        const available = await checkBiometricAvailable();
        setBiometricAvailable(available);
    };

    const handleRegister = async () => {
        if (!username || username.length < 3) {
            Alert.alert('Error', 'Username must be at least 3 characters');
            return;
        }

        if (!password || password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await saveCredentials(username, password, enableBiometric);
            setLoading(false);
            navigation.replace('SetupStep1');
        } catch (error) {
            console.error('Registration error:', error);
            setLoading(false);
            Alert.alert('Error', 'Registration failed: ' + error.message);
        }
    };

    const handleLogin = async () => {
        if (!password) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        setLoading(true);
        try {
            const isValid = await verifyPassword(password);

            if (isValid) {
                // verifyPassword clears logged_out flag
                const { isSetupComplete } = await import('../utils/storage');
                const setupDone = await isSetupComplete();

                setLoading(false);
                if (setupDone) {
                    navigation.replace('MainTabs');
                } else {
                    navigation.replace('SetupStep1');
                }
            } else {
                setLoading(false);
                Alert.alert('Error', 'Incorrect password');
            }
        } catch (error) {
            console.error('Login error:', error);
            setLoading(false);
            Alert.alert('Error', 'Login failed: ' + error.message);
        }
    };

    const handleBiometricLogin = async () => {
        const success = await authenticateWithBiometric();
        if (success) {
            // authenticateWithBiometric clears logged_out flag
            const { isSetupComplete } = await import('../utils/storage');
            const setupDone = await isSetupComplete();

            if (setupDone) {
                navigation.replace('MainTabs');
            } else {
                navigation.replace('SetupStep1');
            }
        } else {
            Alert.alert('Error', 'Biometric authentication failed');
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Animated.View
                            entering={FadeInDown}
                            style={styles.content}
                        >
                            {/* Header with sun animation */}
                            <View style={styles.header}>
                                <Animated.View style={[styles.sunContainer, animatedSunStyle]}>
                                    <Text style={styles.sunIcon}>🌞</Text>
                                </Animated.View>
                                <Text style={styles.title}>Suntime</Text>
                                <Text style={styles.subtitle}>
                                    Your safe sun exposure companion
                                </Text>
                            </View>

                            {/* Mode Switcher with smooth transition */}
                            <View style={styles.modeContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.modeButton,
                                        mode === 'login' && styles.modeButtonActive,
                                    ]}
                                    onPress={() => setMode('login')}
                                >
                                    <Text
                                        style={[
                                            styles.modeText,
                                            mode === 'login' && styles.modeTextActive,
                                        ]}
                                    >
                                        Login
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.modeButton,
                                        mode === 'register' && styles.modeButtonActive,
                                    ]}
                                    onPress={() => setMode('register')}
                                >
                                    <Text
                                        style={[
                                            styles.modeText,
                                            mode === 'register' && styles.modeTextActive,
                                        ]}
                                    >
                                        Register
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Form Card with glassmorphism */}
                            <View style={styles.formCard}>
                                {/* Username Input */}
                                {mode === 'register' && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Username</Text>
                                        <View style={styles.inputWrapper}>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Choose a username"
                                                placeholderTextColor={COLORS.textLight}
                                                value={username}
                                                onChangeText={setUsername}
                                                autoCapitalize="none"
                                            />
                                        </View>
                                        <Text style={styles.hint}>Minimum 3 characters</Text>
                                    </View>
                                )}

                                {/* Login Mode - Show Username */}
                                {mode === 'login' && hasAccount && (
                                    <View style={styles.welcomeCard}>
                                        <Text style={styles.welcomeLabel}>Welcome back!</Text>
                                        <Text style={styles.welcomeUsername}>{username}</Text>
                                    </View>
                                )}

                                {/* Password Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Password</Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter password"
                                            placeholderTextColor={COLORS.textLight}
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry
                                        />
                                    </View>
                                    <Text style={styles.hint}>
                                        {mode === 'register' ? 'Minimum 6 characters' : 'Enter your password'}
                                    </Text>
                                </View>

                                {/* Confirm Password (Register only) */}
                                {mode === 'register' && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Confirm Password</Text>
                                        <View style={styles.inputWrapper}>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Re-enter password"
                                                placeholderTextColor={COLORS.textLight}
                                                value={confirmPassword}
                                                onChangeText={setConfirmPassword}
                                                secureTextEntry
                                            />
                                        </View>
                                    </View>
                                )}

                                {/* Biometric Toggle (Register only) */}
                                {mode === 'register' && biometricAvailable && (
                                    <TouchableOpacity
                                        style={styles.biometricToggle}
                                        onPress={() => setEnableBiometric(!enableBiometric)}
                                    >
                                        <View style={styles.checkboxContainer}>
                                            <View style={[styles.checkbox, enableBiometric && styles.checkboxChecked]}>
                                                {enableBiometric && <Text style={styles.checkmark}>✓</Text>}
                                            </View>
                                            <Text style={styles.biometricText}>
                                                Enable biometric login
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                )}

                                {/* Action Button */}
                                <TouchableOpacity
                                    style={[styles.actionButton, loading && styles.buttonDisabled]}
                                    onPress={mode === 'login' ? handleLogin : handleRegister}
                                    disabled={loading}
                                >
                                    <View style={[styles.buttonContent, loading && { backgroundColor: COLORS.gray }]}>
                                        <Text style={styles.actionButtonText}>
                                            {loading
                                                ? (mode === 'login' ? 'Logging in...' : 'Creating account...')
                                                : (mode === 'login' ? 'Login' : 'Create Account')}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                {/* Biometric Login (Login mode only) */}
                                {mode === 'login' && biometricAvailable && hasAccount && (
                                    <TouchableOpacity
                                        style={styles.biometricButton}
                                        onPress={handleBiometricLogin}
                                    >
                                        <Text style={styles.biometricButtonText}>
                                            Use Biometric Login
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Footer */}
                            <View style={styles.footer}>
                                <Text style={styles.footerText}>
                                    All data stored locally on your device
                                </Text>
                            </View>
                        </Animated.View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    safeArea: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xxl * 2,
        paddingBottom: SPACING.xxl,
    },
    content: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xxl,
    },
    sunContainer: {
        position: 'relative',
        marginBottom: SPACING.lg,
    },
    sunIcon: {
        fontSize: moderateScale(80),
        color: COLORS.primary,
    },
    title: {
        fontSize: moderateScale(48),
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.sm,
    },
    subtitle: {
        fontSize: moderateScale(16),
        color: COLORS.textSecondary,
        textAlign: 'center',
        fontWeight: '500',
    },
    modeContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.backgroundLight,
        borderRadius: BORDER_RADIUS.lg,
        padding: 4,
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    modeButton: {
        flex: 1,
        paddingVertical: SPACING.md,
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.md,
    },
    modeButtonActive: {
        backgroundColor: COLORS.primary,
        ...SHADOWS.small,
    },
    modeText: {
        ...TYPOGRAPHY.subheading,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    modeTextActive: {
        color: COLORS.white,
    },
    formCard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.medium,
    },
    welcomeCard: {
        backgroundColor: COLORS.backgroundLight,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        alignItems: 'center',
    },
    welcomeLabel: {
        fontSize: moderateScale(14),
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    welcomeUsername: {
        fontSize: moderateScale(24),
        fontWeight: 'bold',
        color: COLORS.text,
    },
    inputGroup: {
        marginBottom: SPACING.lg,
    },
    label: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        marginBottom: SPACING.sm,
        color: COLORS.text,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundLight,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 2,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.md,
    },
    input: {
        flex: 1,
        paddingVertical: SPACING.md,
        fontSize: moderateScale(16),
        color: COLORS.text,
    },
    hint: {
        fontSize: moderateScale(12),
        color: COLORS.textLight,
        marginTop: SPACING.xs,
        fontStyle: 'italic',
    },
    biometricToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.lg,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    checkbox: {
        width: moderateScale(24),
        height: moderateScale(24),
        borderRadius: BORDER_RADIUS.sm,
        borderWidth: 2,
        borderColor: COLORS.primary,
        marginRight: SPACING.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    checkmark: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    biometricText: {
        flex: 1,
        color: COLORS.text,
        fontSize: 14,
        fontWeight: '500',
    },
    actionButton: {
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
        marginTop: SPACING.md,
        ...SHADOWS.large,
    },
    buttonContent: {
        paddingVertical: SPACING.md + 4,
        alignItems: 'center',
        backgroundColor: COLORS.primary,
    },
    actionButtonText: {
        ...TYPOGRAPHY.subheading,
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: moderateScale(18),
    },
    biometricButton: {
        backgroundColor: COLORS.backgroundLight,
        borderRadius: BORDER_RADIUS.lg,
        paddingVertical: SPACING.md,
        alignItems: 'center',
        marginTop: SPACING.md,
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    biometricButtonText: {
        color: COLORS.text,
        fontSize: moderateScale(16),
        fontWeight: '600',
    },
    footer: {
        alignItems: 'center',
        paddingTop: SPACING.xl,
    },
    footerText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});
