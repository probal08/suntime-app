import React, { useState, useEffect, useMemo } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale, GRADIENTS, GLASS, COLORS } from '../constants/theme';
import {
    saveCredentials,
    verifyPassword,
    getUsername,
    authenticateWithBiometric,
    checkBiometricAvailable,
    isBiometricEnabled,
    isUserRegistered,
    getSecurityQuestion,
    verifySecurityAnswer,
    resetPassword,
} from '../utils/auth';

export default function AuthScreen({ navigation }) {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => getStyles(colors), [colors]);
    const [mode, setMode] = useState('login'); // 'login' or 'register'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [enableBiometric, setEnableBiometric] = useState(false);
    const [loading, setLoading] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [hasAccount, setHasAccount] = useState(false);

    // Security Question State
    const [securityQuestion, setSecurityQuestion] = useState('');
    const [securityAnswer, setSecurityAnswer] = useState('');

    // Recovery State
    const [recoveryStep, setRecoveryStep] = useState(0); // 0: Username, 1: Answer, 2: New Password
    const [recoveryQuestion, setRecoveryQuestion] = useState('');

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

        if (!securityQuestion.trim() || !securityAnswer.trim()) {
            Alert.alert('Error', 'Please set a security question and answer for account recovery');
            return;
        }

        setLoading(true);
        try {
            await saveCredentials(username, password, enableBiometric, securityQuestion, securityAnswer);
            setLoading(false);
            navigation.replace('SetupStep1');
        } catch (error) {
            console.error('Registration error:', error);
            setLoading(false);
            Alert.alert('Error', 'Registration failed: ' + error.message);
        }
    };

    const handleRecovery = async () => {
        if (recoveryStep === 0) {
            // Step 1: Check Username
            if (!username) {
                Alert.alert('Error', 'Please enter your username');
                return;
            }
            // In a local app, we verify simply by checking if security question exists
            // But we should verify if the username matches the stored one
            const storedUsername = await getUsername();
            if (storedUsername !== username) {
                Alert.alert('Error', 'Username not found');
                return;
            }

            const question = await getSecurityQuestion();
            if (question) {
                setRecoveryQuestion(question);
                setRecoveryStep(1);
            } else {
                Alert.alert('Error', 'No security question set for this account.');
            }
        } else if (recoveryStep === 1) {
            // Step 2: Verify Answer
            if (!securityAnswer) {
                Alert.alert('Error', 'Please enter your answer');
                return;
            }
            const isValid = await verifySecurityAnswer(securityAnswer);
            if (isValid) {
                setRecoveryStep(2);
                setSecurityAnswer(''); // Clear for security
            } else {
                Alert.alert('Error', 'Incorrect answer');
            }
        } else if (recoveryStep === 2) {
            // Step 3: Reset Password
            if (!password || password.length < 6) {
                Alert.alert('Error', 'Password must be at least 6 characters');
                return;
            }
            if (password !== confirmPassword) {
                Alert.alert('Error', 'Passwords do not match');
                return;
            }

            setLoading(true);
            const success = await resetPassword(password);
            setLoading(false);

            if (success) {
                Alert.alert('Success', 'Password reset successfully. Please login.');
                setMode('login');
                setRecoveryStep(0);
                setPassword('');
                setConfirmPassword('');
            } else {
                Alert.alert('Error', 'Failed to reset password');
            }
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
            <LinearGradient
                colors={isDark ? GRADIENTS.night : GRADIENTS.sunrise}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
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
                                {mode !== 'forgot' ? (
                                    <>
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
                                                hasAccount && { opacity: 0.5 }
                                            ]}
                                            onPress={() => {
                                                if (hasAccount) {
                                                    Alert.alert('Account Exists', 'An account is already set up on this device. Please login or reset the app data from device settings to create a new one.');
                                                } else {
                                                    setMode('register');
                                                }
                                            }}
                                            activeOpacity={hasAccount ? 1 : 0.7}
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
                                    </>
                                ) : (
                                    <View style={styles.modeButtonActive}>
                                        <Text style={[styles.modeText, styles.modeTextActive]}>
                                            Reset Password
                                        </Text>
                                    </View>
                                )}
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
                                                placeholderTextColor={colors.textLight}
                                                value={username}
                                                onChangeText={setUsername}
                                                autoCapitalize="none"
                                            />
                                        </View>
                                        <Text style={styles.hint}>Minimum 3 characters</Text>
                                    </View>
                                )}

                                {/* Forgot Password - Step 0: Username */}
                                {mode === 'forgot' && recoveryStep === 0 && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Enter Username</Text>
                                        <View style={styles.inputWrapper}>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Your username"
                                                placeholderTextColor={colors.textLight}
                                                value={username}
                                                onChangeText={setUsername}
                                                autoCapitalize="none"
                                            />
                                        </View>
                                    </View>
                                )}

                                {/* Forgot Password - Step 1: Answer Question */}
                                {mode === 'forgot' && recoveryStep === 1 && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Security Question</Text>
                                        <Text style={[styles.subtitle, { marginBottom: SPACING.md, textAlign: 'left' }]}>
                                            {recoveryQuestion}
                                        </Text>
                                        <View style={styles.inputWrapper}>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Your answer"
                                                placeholderTextColor={colors.textLight}
                                                value={securityAnswer}
                                                onChangeText={setSecurityAnswer}
                                            />
                                        </View>
                                    </View>
                                )}

                                {/* Login Mode - Show Username */}
                                {mode === 'login' && hasAccount && (
                                    <View style={styles.welcomeCard}>
                                        <Text style={styles.welcomeLabel}>Welcome back!</Text>
                                        <Text style={styles.welcomeUsername}>{username}</Text>
                                    </View>
                                )}

                                {/* Password Input (Login/Register/Forgot Step 2) */}
                                {(mode === 'login' || mode === 'register' || (mode === 'forgot' && recoveryStep === 2)) && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>
                                            {mode === 'forgot' ? 'New Password' : 'Password'}
                                        </Text>
                                        <View style={styles.inputWrapper}>
                                            <TextInput
                                                style={styles.input}
                                                placeholder={mode === 'forgot' ? "Enter new password" : "Enter password"}
                                                placeholderTextColor={colors.textLight}
                                                value={password}
                                                onChangeText={setPassword}
                                                secureTextEntry
                                            />
                                        </View>
                                        <Text style={styles.hint}>
                                            {mode === 'register' || mode === 'forgot' ? 'Minimum 6 characters' : 'Enter your password'}
                                        </Text>
                                    </View>
                                )}

                                {/* Confirm Password (Register or Forgot Step 2) */}
                                {(mode === 'register' || (mode === 'forgot' && recoveryStep === 2)) && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Confirm Password</Text>
                                        <View style={styles.inputWrapper}>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Re-enter password"
                                                placeholderTextColor={colors.textLight}
                                                value={confirmPassword}
                                                onChangeText={setConfirmPassword}
                                                secureTextEntry
                                            />
                                        </View>
                                    </View>
                                )}

                                {/* Security Question (Register Only) */}
                                {mode === 'register' && (
                                    <>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Security Question</Text>
                                            <View style={styles.inputWrapper}>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="e.g. What is your pet's name?"
                                                    placeholderTextColor={colors.textLight}
                                                    value={securityQuestion}
                                                    onChangeText={setSecurityQuestion}
                                                />
                                            </View>
                                        </View>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Security Answer</Text>
                                            <View style={styles.inputWrapper}>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="Your answer"
                                                    placeholderTextColor={colors.textLight}
                                                    value={securityAnswer}
                                                    onChangeText={setSecurityAnswer}
                                                />
                                            </View>
                                            <Text style={styles.hint}>Used for password recovery</Text>
                                        </View>
                                    </>
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



                                {/* Forgot Password Link (Login Only) */}
                                {mode === 'login' && hasAccount && (
                                    <TouchableOpacity
                                        style={{ alignSelf: 'flex-end', marginBottom: SPACING.md }}
                                        onPress={async () => {
                                            const question = await getSecurityQuestion();
                                            if (question) {
                                                setMode('forgot');
                                                setRecoveryQuestion(question);
                                                setRecoveryStep(1); // Skip username, go directly to question
                                                setSecurityAnswer('');
                                                setPassword('');
                                                setConfirmPassword('');
                                            } else {
                                                Alert.alert('Error', 'No security question found. Please reset app data to create a new account.');
                                            }
                                        }}
                                    >
                                        <Text style={{ color: colors.primary, fontWeight: '600' }}>
                                            Forgot Password?
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                {/* Cancel Recovery Link */}
                                {mode === 'forgot' && (
                                    <TouchableOpacity
                                        style={{ alignSelf: 'center', marginBottom: SPACING.md }}
                                        onPress={() => setMode('login')}
                                    >
                                        <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
                                            Cancel
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                {/* Action Button */}
                                <TouchableOpacity
                                    style={[styles.actionButton, loading && styles.buttonDisabled]}
                                    onPress={
                                        mode === 'login' ? handleLogin :
                                            mode === 'register' ? handleRegister :
                                                handleRecovery
                                    }
                                    disabled={loading}
                                >
                                    <View style={[styles.buttonContent, loading && { backgroundColor: colors.gray }]}>
                                        <Text style={styles.actionButtonText}>
                                            {loading
                                                ? 'Processing...'
                                                : (mode === 'login' ? 'Login' :
                                                    mode === 'register' ? 'Create Account' :
                                                        mode === 'forgot' ? (recoveryStep < 2 ? 'Next' : 'Reset Password') : 'Submit')}
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
        </View >
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
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
        paddingTop: SPACING.xl,
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
        color: COLORS.white, // White sun on gradient looks better
        textShadowColor: 'rgba(255, 255, 255, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
    },
    title: {
        fontSize: moderateScale(48),
        fontWeight: 'bold',
        color: COLORS.white, // White text on gradient
        marginBottom: SPACING.sm,
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: moderateScale(16),
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
        fontWeight: '500',
    },
    modeContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.1)', // Subtle tint
        borderRadius: BORDER_RADIUS.lg,
        padding: 4,
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    modeButton: {
        flex: 1,
        paddingVertical: SPACING.md,
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.md,
    },
    modeButtonActive: {
        backgroundColor: colors.primary,
        ...SHADOWS.small,
    },
    modeText: {
        ...TYPOGRAPHY.subheading,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    modeTextActive: {
        color: colors.white,
    },
    formCard: {
        ...(colors === '#121212' || colors.background === '#121212' ? GLASS.dark : GLASS.default), // Use Glassmorphism
        backgroundColor: colors.cardBackground, // Fallback/Mix
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        ...SHADOWS.large,
        width: '100%',
    },
    welcomeCard: {
        backgroundColor: colors.backgroundLight,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        alignItems: 'center',
    },
    welcomeLabel: {
        fontSize: moderateScale(14),
        color: colors.textSecondary,
        marginBottom: SPACING.xs,
    },
    welcomeUsername: {
        fontSize: moderateScale(24),
        fontWeight: 'bold',
        color: colors.text,
    },
    inputGroup: {
        marginBottom: SPACING.lg,
    },
    label: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        marginBottom: SPACING.sm,
        color: colors.text,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundLight,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 2,
        borderColor: colors.border,
        paddingHorizontal: SPACING.md,
    },
    input: {
        flex: 1,
        paddingVertical: SPACING.md,
        fontSize: moderateScale(16),
        color: colors.text,
    },
    hint: {
        fontSize: moderateScale(12),
        color: colors.textLight,
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
        borderColor: colors.primary,
        marginRight: SPACING.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    checkmark: {
        color: colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    biometricText: {
        flex: 1,
        color: colors.text,
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
        backgroundColor: colors.primary,
    },
    actionButtonText: {
        ...TYPOGRAPHY.subheading,
        color: colors.white,
        fontWeight: 'bold',
        fontSize: moderateScale(18),
    },
    biometricButton: {
        backgroundColor: colors.backgroundLight,
        borderRadius: BORDER_RADIUS.lg,
        paddingVertical: SPACING.md,
        alignItems: 'center',
        marginTop: SPACING.md,
        borderWidth: 2,
        borderColor: colors.border,
    },
    biometricButtonText: {
        color: colors.text,
        fontSize: moderateScale(16),
        fontWeight: '600',
    },
    footer: {
        alignItems: 'center',
        paddingTop: SPACING.xl,
    },
    footerText: {
        color: colors.textSecondary,
        fontSize: 13,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});
