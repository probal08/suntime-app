import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    InteractionManager,
    BackHandler,
    ToastAndroid,
    Platform,
    AppState
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    ZoomIn
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale, GRADIENTS, GLASS, COLORS } from '../constants/theme';
import { MoreVertical } from 'lucide-react-native';
import MenuDrawer from '../components/MenuDrawer';
import { getUserSettings, getManualUV, addSessionLog, getDefaultPreferences, getSessionLogs, getProfileImage } from '../utils/storage';
import { getUsername, logout } from '../utils/auth';
import { calculateSafeTime, getUVCategory } from '../utils/sunLogic';

const UV_SCALE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const getScaleColor = (uv) => {
    if (uv <= 2) return '#2E7D32'; // Strong Green
    if (uv <= 5) return '#F9A825'; // Vibrant Gold
    if (uv <= 7) return '#EF6C00'; // Deep Orange
    if (uv <= 10) return '#C62828'; // Strong Red
    return '#6A1B9A'; // Deep Violet
};

const RISK_LEVELS = [
    { range: '0-2', level: 'Low', color: '#2E7D32' },
    { range: '3-5', level: 'Moderate', color: '#F9A825' },
    { range: '6-7', level: 'High', color: '#EF6C00' },
    { range: '8-10', level: 'Very High', color: '#C62828' },
    { range: '11+', level: 'Extreme', color: '#6A1B9A' },
];

export default function HomeScreen({ navigation }) {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => getStyles(colors), [colors]);
    // UV state
    const [uvIndex, setUvIndex] = useState(null);
    const [loading, setLoading] = useState(true);
    const [skinType, setSkinType] = useState(3);
    const [isCloudy, setIsCloudy] = useState(false);
    const [hasSunscreen, setHasSunscreen] = useState(false);
    const [safeMinutes, setSafeMinutes] = useState(30);
    const [isManualData, setIsManualData] = useState(false); // Track if using manual override

    // Timer state - TIMESTAMP-BASED for robustness
    const [timeLeft, setTimeLeft] = useState(1800); // seconds
    const [isActive, setIsActive] = useState(false);
    const [hasStarted, setHasStarted] = useState(false); // New state to track if timer was ever started
    const [endTimestamp, setEndTimestamp] = useState(null); // CRITICAL: stores when timer should end
    const intervalRef = useRef(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [username, setUsername] = useState('User');
    const [profileImage, setProfileImage] = useState(null);

    // Animation values
    const pulseValue = useSharedValue(1);

    useEffect(() => {
        // Delay animation start to ensure Reanimated runtime is ready
        // Use InteractionManager to ensure native interactions are complete
        const task = InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => {
                try {
                    pulseValue.value = withRepeat(
                        withSequence(
                            withSpring(1.05, { damping: 2 }),
                            withSpring(1, { damping: 2 })
                        ),
                        -1, // infinite
                        true
                    );
                } catch (error) {
                    console.error('Animation initialization error:', error);
                }
            });
        });

        return () => task.cancel();
    }, []);

    // Disabled pulse animation as per user feedback ("jumping")
    const animatedUVStyle = useAnimatedStyle(() => ({
        transform: [{ scale: 1 }],
    }));

    // Fetch UV Index from Open-Meteo API
    const fetchUVIndex = async (latitude, longitude) => {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=uv_index&timezone=auto`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.current && data.current.uv_index !== undefined) {
                return data.current.uv_index;
            }
            return null;
        } catch (error) {
            console.error('Error fetching UV data:', error);
            return null;
        }
    };

    // Double tap to exit logic
    useFocusEffect(
        useCallback(() => {
            let lastBackPress = 0;

            const onBackPress = () => {
                const now = Date.now();
                if (now - lastBackPress < 2000) {
                    BackHandler.exitApp();
                    return true;
                }

                lastBackPress = now;
                if (Platform.OS === 'android') {
                    ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
                } else {
                    // For iOS or other platforms where ToastAndroid isn't available
                    // We typically typically rely on gesture swiping, but this is good fallback
                }
                return true;
            };

            const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => backHandler.remove();
        }, [])
    );

    // Schedule Daily Reminder (Smart Logic)
    useEffect(() => {
        const updateDailyNotification = async () => {
            try {
                // Get logs for TODAY
                const logs = await getSessionLogs();
                const today = new Date().toISOString().split('T')[0];
                const hasSessionToday = logs.some(log => log.date.startsWith(today));

                // Cancel existing daily notification
                const scheduled = await Notifications.getAllScheduledNotificationsAsync();
                const dailyId = scheduled.find(n => n.content.title.includes('Daily Sun Goal'))?.identifier;

                if (dailyId) {
                    await Notifications.cancelScheduledNotificationAsync(dailyId);
                }

                // Determine message based on state
                const content = hasSessionToday ? {
                    title: 'Daily Sun Goal 🌞',
                    body: 'Great job meeting your sunlight goal today!',
                } : {
                    title: 'Daily Sun Goal 🌙',
                    body: "You missed today's goal. Let's try again tomorrow!",
                };

                // Schedule for 6 PM
                await Notifications.scheduleNotificationAsync({
                    content,
                    trigger: {
                        hour: 18,
                        minute: 0,
                        repeats: true, // Recurring check
                    },
                });
                console.log('Updated Daily Notification:', content.body);
            } catch (e) {
                console.log('Schedule error', e);
            }
        };

        updateDailyNotification();
    }, []); // Run only once on mount (updates are handled manually via handleTimerComplete)

    // Initialize data
    useEffect(() => {
        initializeData();
    }, []);

    // Refresh data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            initializeData();
        }, [])
    );

    // Recalculate safe time when conditions change
    useEffect(() => {
        if (uvIndex !== null && skinType !== null) {
            const newSafeTime = calculateSafeTime(uvIndex, skinType, isCloudy, hasSunscreen);
            setSafeMinutes(newSafeTime);

            // Only reset timeLeft if the timer hasn't started yet
            if (!hasStarted && !isActive) {
                setTimeLeft(newSafeTime * 60);
            }
        }
    }, [uvIndex, skinType, isCloudy, hasSunscreen, hasStarted]);

    // Timer countdown - TIMESTAMP-BASED APPROACH
    useEffect(() => {
        if (isActive && endTimestamp) {
            intervalRef.current = setInterval(() => {
                // Calculate remaining time from timestamp
                const remaining = Math.max(0, Math.ceil((endTimestamp - Date.now()) / 1000));
                setTimeLeft(remaining);

                if (remaining <= 0) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    handleTimerComplete();
                }
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isActive, endTimestamp]);

    const initializeData = async () => {
        try {
            const settings = await getUserSettings();
            setSkinType(settings.skinType || 3);

            // Load default sunscreen preference from setup (Step 2)
            const prefs = await getDefaultPreferences();
            const hasSPF = prefs.sunscreen === true;
            setHasSunscreen(hasSPF);
            console.log('✅ Sunscreen from setup:', hasSPF, 'Prefs:', prefs);

            // Check for manual UV override FIRST
            const manualUV = await getManualUV();
            console.log('Manual UV check:', manualUV);

            if (manualUV !== null && manualUV !== undefined) {
                console.log('✅ Using manual UV:', manualUV);
                setUvIndex(manualUV);
                setIsManualData(true);
                setLoading(false);
                return; // Exit early - don't fetch from API
            }
            setIsManualData(false);

            console.log('No manual UV set, checking location/API...');

            // Get location permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Location Permission Required');
                setUvIndex(5); // Fallback
                setLoading(false);
                return;
            }

            // Get current location
            const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            // Fetch UV index
            const uv = await fetchUVIndex(
                currentLocation.coords.latitude,
                currentLocation.coords.longitude
            );

            const finalUV = uv !== null ? uv : 5;
            setUvIndex(finalUV);
            // Debug alert removed for production
            setLoading(false);

            setLoading(false);

            // Fetch user info for menu
            const user = await getUsername();
            if (user) setUsername(user);
            const img = await getProfileImage();
            if (img) setProfileImage(img);
        } catch (error) {
            console.error('Error initializing data:', error);
            setUvIndex(5);
            setLoading(false);
        }
    };

    const handleTimerComplete = async () => {
        setIsActive(false);
        if (intervalRef.current) clearInterval(intervalRef.current);

        // Trigger haptic feedback
        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch (error) {
            console.error('Haptics error:', error);
        }

        // Send notification ONLY if app is in background
        if (AppState.currentState !== 'active') {
            try {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: '⏰ Sun Exposure Complete!',
                        body: 'Your safe sun time is up. Consider seeking shade.',
                        sound: true,
                    },
                    trigger: null,
                });
            } catch (error) {
                console.error('Notification error:', error);
            }
        }

        // Update daily notification (Switch to "Goal Met")
        try {
            // Cancel existing
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            const dailyId = scheduled.find(n => n.content.title.includes('Daily Sun Goal'))?.identifier;
            if (dailyId) await Notifications.cancelScheduledNotificationAsync(dailyId);

            // Schedule "Goal Met"
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Daily Sun Goal 🌞',
                    body: 'Great job meeting your sunlight goal today!',
                },
                trigger: {
                    hour: 18,
                    minute: 0,
                    repeats: true,
                },
            });
        } catch (e) { console.log('Update notif error', e); }

        // Log the session
        console.log('⏰ Timer complete! Logging session:', {
            uvIndex,
            duration: safeMinutes,
            skinType,
            date: new Date().toISOString()
        });

        await addSessionLog({
            uvIndex,
            duration: safeMinutes,
            skinType,
            date: new Date().toISOString(),
        });

        console.log('✅ Session logged successfully! Check Progress tab.');

        Alert.alert(
            "Time's Up!",
            "Your safe sun exposure time is complete.\n\n✅ Session logged to Progress tab!"
        );
    };

    const startTimer = () => {
        // Set end timestamp based on current timeLeft
        const endTime = Date.now() + (timeLeft * 1000);
        setEndTimestamp(endTime);
        setIsActive(true);
        setHasStarted(true);
    };

    const stopTimer = () => {
        setIsActive(false);
        setEndTimestamp(null);
    };

    const resetTimer = () => {
        setIsActive(false);
        setEndTimestamp(null);
        setHasStarted(false); // Reset this so it can be auto-updated again
        setTimeLeft(safeMinutes * 60);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Fetching UV data...</Text>
            </SafeAreaView>
        );
    }

    const uvCategory = getUVCategory(uvIndex || 0);
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    const progress = (timeLeft / (safeMinutes * 60)) * 100;

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={isDark ? GRADIENTS.night : GRADIENTS.sunrise}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                opacity={isDark ? 0.8 : 0.3} // Slightly more opaque in dark mode for better contrast, subtle in light
            />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ width: 40 }} />
                    <LinearGradient
                        colors={GRADIENTS.primary}
                        style={{ padding: 2, borderRadius: 8, opacity: 0.9 }}
                    >
                        <Text style={[styles.logo, { color: colors.white }]}>Suntime</Text>
                    </LinearGradient>
                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => setIsMenuOpen(true)}
                    >
                        <MoreVertical size={moderateScale(24)} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* FEATURE 1: UV INDEX COLOR SCALE */}
                <View style={styles.scaleContainer}>
                    <Text style={styles.scaleLabel}>UV Spectrum</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.uvScaleScroll}
                        style={{ flexGrow: 0 }}
                    >
                        <View style={styles.uvScale}>
                            {UV_SCALE_NUMBERS.map((num) => {
                                const isSelected = uvIndex !== null && (num === 11 ? uvIndex >= 11 : Math.round(uvIndex) === num);
                                return (
                                    <View
                                        key={num}
                                        style={[
                                            styles.scaleItem,
                                            { backgroundColor: getScaleColor(num) },
                                            isSelected && styles.scaleItemActive
                                        ]}
                                    >
                                        <Text style={[styles.scaleText, isSelected && styles.scaleTextActive]}>
                                            {num}{num === 11 ? '+' : ''}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>

                {/* UV Widget - Glass Effect */}
                <Animated.View entering={FadeInDown} style={styles.uvWidgetContainer}>
                    <LinearGradient
                        colors={GRADIENTS.darkCard}
                        style={styles.uvWidgetGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Animated.View style={[styles.uvInfo, animatedUVStyle]}>
                            <Text style={[styles.uvLabel, { color: COLORS.white }]}>
                                {isManualData ? 'MANUAL UV' : 'UV INDEX'}
                            </Text>
                            <Text style={[styles.uvValue, { color: uvCategory.color }]}>
                                {(uvIndex || 0).toFixed(1)}
                            </Text>
                            <Text style={[styles.uvLevel, { color: uvCategory.color }]}>
                                {uvCategory.level}
                            </Text>
                        </Animated.View>
                    </LinearGradient>
                </Animated.View>

                {/* Circular Countdown Timer */}
                <Animated.View entering={ZoomIn} style={styles.timerContainer}>
                    <View style={styles.circularTimer}>
                        <View
                            style={[
                                styles.progressRing,
                                {
                                    borderColor: progress > 20 ? colors.success : colors.danger,
                                },
                            ]}
                        />
                        <View style={styles.timerContent}>
                            <Text style={styles.timerTime}>{formattedTime}</Text>
                            <Text style={styles.timerLabel}>Safe Time</Text>
                        </View>
                    </View>

                    {/* Timer Controls */}
                    <View style={styles.controlsContainer}>
                        {!isActive ? (
                            <TouchableOpacity onPress={startTimer} style={styles.shadowButtonWrapper}>
                                <LinearGradient
                                    colors={GRADIENTS.primary}
                                    style={styles.startButton}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Text style={styles.buttonText}>Start Timer</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.activeControls}>
                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={stopTimer}
                                >
                                    <Text style={styles.buttonText}>Pause</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.controlButton, styles.resetButton]}
                                    onPress={resetTimer}
                                >
                                    <Text style={styles.buttonText}>Reset</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </Animated.View>

                {/* Environment Toggles */}
                <View style={styles.togglesContainer}>
                    <TouchableOpacity
                        style={[styles.toggle, isCloudy && styles.toggleActive]}
                        onPress={() => setIsCloudy(!isCloudy)}
                    >
                        <Text style={[styles.toggleText, isCloudy && styles.toggleTextActive]}>
                            Cloudy
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.toggle, hasSunscreen && styles.toggleActive]}
                        onPress={() => setHasSunscreen(!hasSunscreen)}
                    >
                        <Text style={[styles.toggleText, hasSunscreen && styles.toggleTextActive]}>
                            Sunscreen
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* High UV Warning */}
                {uvIndex >= 10 && (
                    <View style={styles.warningBanner}>
                        <View style={styles.warningTextContainer}>
                            <Text style={styles.warningTitle}>Extreme UV Alert!</Text>
                            <Text style={styles.warningText}>
                                UV Index is dangerously high. Limit sun exposure.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Safe Time Display */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoText}>
                        Your safe sun exposure time: <Text style={styles.infoHighlight}>{safeMinutes} minutes</Text>
                    </Text>
                </View>

                {/* FEATURE 2: RISK LEVEL LEGEND */}
                <View style={styles.riskLegendCard}>
                    <Text style={styles.riskLegendTitle}>Risk Level Guide</Text>
                    <View style={styles.riskList}>
                        {RISK_LEVELS.map((item, index) => (
                            <View key={index} style={styles.riskRow}>
                                <View style={styles.riskRangeContainer}>
                                    <View style={[styles.riskDot, { backgroundColor: item.color }]} />
                                    <Text style={styles.riskRange}>{item.range}</Text>
                                </View>
                                <Text style={[styles.riskLevel, { color: item.color }]}>{item.level}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                    <Text style={styles.disclaimerText}>Estimates only. Not medical advice.</Text>
                </View>
            </ScrollView>

            {/* Slide-out Menu Drawer */}
            <MenuDrawer
                isVisible={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                navigation={navigation}
                username={username}
                profileImage={profileImage}
                onLogout={async () => {
                    await logout();
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Auth' }],
                    });
                }}
            />
        </SafeAreaView >
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: moderateScale(100),
    },
    loadingText: {
        ...TYPOGRAPHY.body,
        marginTop: SPACING.md,
        textAlign: 'center',
        color: colors.textSecondary,
    },
    header: {
        marginBottom: SPACING.xl,
        alignItems: 'center',
        paddingTop: SPACING.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.xs,
    },
    menuButton: {
        padding: SPACING.sm,
    },
    logo: {
        ...TYPOGRAPHY.title,
        color: colors.primary,
        fontWeight: 'bold',
        letterSpacing: -0.5,
        flex: 1,
        textAlign: 'center',
    },
    uvWidgetContainer: {
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        marginBottom: SPACING.xl,
        ...SHADOWS.medium,
        width: '100%',
    },
    uvWidgetGradient: {
        padding: SPACING.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uvInfo: {
        alignItems: 'center',
    },
    uvLabel: {
        ...TYPOGRAPHY.caption,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: SPACING.xs,
        color: colors.textSecondary,
    },
    uvValue: {
        fontSize: moderateScale(56),
        fontWeight: 'bold',
        marginVertical: SPACING.sm,
    },
    uvLevel: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '600',
        marginTop: SPACING.xs,
    },
    timerContainer: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        ...SHADOWS.medium,
        ...(colors.background === '#121212' ? GLASS.dark : GLASS.default),
        borderWidth: 0,
        width: '100%',
    },
    circularTimer: {
        width: moderateScale(200),
        height: moderateScale(200),
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        marginBottom: SPACING.lg,
    },
    progressRing: {
        position: 'absolute',
        width: moderateScale(200),
        height: moderateScale(200),
        borderRadius: moderateScale(100),
        borderWidth: moderateScale(10),
    },
    timerContent: {
        alignItems: 'center',
    },
    timerTime: {
        fontSize: moderateScale(48),
        fontWeight: 'bold',
        color: colors.text,
        letterSpacing: -1,
    },
    timerLabel: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        marginTop: SPACING.xs,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    controlsContainer: {
        marginTop: SPACING.md,
        width: '100%',
        maxWidth: 400, // Constrain max width for tablets
        alignSelf: 'center',
    },
    shadowButtonWrapper: {
        ...SHADOWS.button,
        borderRadius: BORDER_RADIUS.lg,
    },
    startButton: {
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
        width: '100%',
    },
    activeControls: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    controlButton: {
        flex: 1,
        backgroundColor: colors.primary,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md, // Reduced padding
        alignItems: 'center',
        ...SHADOWS.button,
    },
    resetButton: {
        backgroundColor: colors.textSecondary,
        ...SHADOWS.small,
    },
    buttonText: {
        ...TYPOGRAPHY.subheading,
        color: colors.white,
        fontWeight: '600',
        fontSize: moderateScale(16),
    },
    togglesContainer: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.xl,
    },
    toggle: {
        flex: 1,
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md + 2,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.border,
        ...SHADOWS.small,
    },
    toggleActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    toggleText: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        color: colors.text,
        fontSize: moderateScale(14),
    },
    toggleTextActive: {
        color: colors.white,
    },
    infoCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        borderLeftWidth: 5,
        borderLeftColor: colors.primary,
        ...SHADOWS.small,
        marginBottom: SPACING.md,
        ...(colors.background === '#121212' ? GLASS.dark : GLASS.default), // Dynamic Glass
    },
    infoText: {
        ...TYPOGRAPHY.body,
        lineHeight: 24,
        color: colors.text,
    },
    infoHighlight: {
        fontWeight: 'bold',
        color: colors.primary,
        fontSize: moderateScale(18),
    },
    warningBanner: {
        backgroundColor: colors.backgroundLight,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.xl,
        borderLeftWidth: 5,
        borderLeftColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    warningIcon: {
        fontSize: moderateScale(36),
        marginRight: SPACING.md,
    },
    warningTextContainer: {
        flex: 1,
    },
    warningTitle: {
        ...TYPOGRAPHY.subheading,
        color: colors.text,
        fontWeight: 'bold',
        marginBottom: SPACING.xs,
    },
    warningText: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    disclaimer: {
        marginTop: SPACING.sm,
        marginBottom: SPACING.lg,
        padding: SPACING.md,
        alignItems: 'center',
        backgroundColor: colors.backgroundLight,
        borderRadius: BORDER_RADIUS.md,
    },
    disclaimerText: {
        ...TYPOGRAPHY.caption,
        fontStyle: 'italic',
        color: colors.textSecondary,
    },
    // New Styles
    scaleContainer: {
        marginBottom: SPACING.lg,
        alignItems: 'center',
    },
    scaleLabel: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        marginBottom: SPACING.xs,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    uvScale: {
        flexDirection: 'row',
        gap: moderateScale(8),
        paddingHorizontal: SPACING.xs,
        paddingVertical: SPACING.xs, // Add padding for shadow clipping
    },
    uvScaleScroll: {
        paddingRight: SPACING.lg, // Extra padding at end
    },
    scaleItem: {
        width: moderateScale(28), // Slightly larger
        height: moderateScale(28),
        borderRadius: moderateScale(14),
        justifyContent: 'center',
        alignItems: 'center',
        // No opacity, solid colors
    },
    scaleItemActive: {
        transform: [{ scale: 1.2 }], // Scale 1.2x
        borderWidth: 3, // Thick border
        borderColor: colors.text, // Dynamic border color
        ...SHADOWS.medium,
        zIndex: 10,
    },
    scaleText: {
        fontSize: moderateScale(12),
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    scaleTextActive: {
        fontSize: moderateScale(13),
    },
    riskLegendCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        ...SHADOWS.small,
    },
    riskLegendTitle: {
        ...TYPOGRAPHY.subheading,
        fontWeight: 'bold',
        marginBottom: SPACING.md,
        color: colors.text,
    },
    riskList: {
        gap: SPACING.sm,
    },
    riskRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    riskRangeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    riskDot: {
        width: moderateScale(12),
        height: moderateScale(12),
        borderRadius: moderateScale(6),
    },
    riskRange: {
        ...TYPOGRAPHY.body,
        color: colors.text,
        fontWeight: '600',
        width: moderateScale(50),
    },
    riskLevel: {
        ...TYPOGRAPHY.body,
        fontWeight: 'bold',
    },
});
