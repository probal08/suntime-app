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
import {
    scheduleNotificationAtDate,
    scheduleDailyNotification,
    cancelNotification,
    getScheduledNotifications,
    scheduleSunExposureReminder,
    scheduleImmediateNotification
} from '../services/notifications';
import Animated, {
    FadeInDown,
    ZoomIn,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    FadeInRight
} from 'react-native-reanimated';
import { CloudRain, Wind, Thermometer, MapPin, Droplets } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import WelcomeModal from '../components/WelcomeModal';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale, GRADIENTS, GLASS, COLORS } from '../constants/theme';

import { saveSessionToFirestore, fetchUserData, saveUserToFirestore } from '../services/firestore';
import { auth } from '../config/firebase';
import {
    getUserSettings,
    getManualUV,
    getDefaultPreferences,
    getActiveTimer,
    setActiveTimer,
    clearActiveTimer,
    getSessionLogs
} from '../utils/localStorage';
import { calculateSafeTime, getUVCategory, calculateExposureScore, getVitaminDStatus } from '../utils/sunLogic';
import StandardButton from '../components/common/StandardButton';
import SunTimer from '../components/SunTimer';
import SessionCompleteOverlay from '../components/SessionCompleteOverlay';

const UV_SCALE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const getScaleColor = (uv) => {
    if (uv <= 2) return '#2E7D32'; // Strong Green
    if (uv <= 5) return '#F9A825'; // Vibrant Gold
    if (uv <= 7) return '#EF6C00'; // Deep Orange
    if (uv <= 10) return '#C62828'; // Strong Red
    return '#6A1B9A'; // Deep Violet
};

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
    const [vitDAdjust, setVitDAdjust] = useState(0); // Vitamin D Adjustment minutes
    const [isPhotosensitive, setIsPhotosensitive] = useState(false); // Medication factor

    // Daily Limit State
    const [dailyLimitReached, setDailyLimitReached] = useState(false);

    // Weather state
    const [weather, setWeather] = useState(null);
    const [city, setCity] = useState('Loading...');

    // Welcome Modal
    const [showWelcome, setShowWelcome] = useState(false);

    // Timer state - TIMESTAMP-BASED for robustness
    const [timeLeft, setTimeLeft] = useState(1800); // seconds
    const [isActive, setIsActive] = useState(false);
    const [hasStarted, setHasStarted] = useState(false); // Track if timer was ever started
    const [isSessionComplete, setIsSessionComplete] = useState(false); // NEW: Track session completion
    const [endTimestamp, setEndTimestamp] = useState(null); // CRITICAL: stores when timer should end
    const intervalRef = useRef(null);
    const notificationIdRef = useRef(null);

    // Animation values
    const pulseValue = useSharedValue(1);

    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => {
                try {
                    pulseValue.value = withRepeat(
                        withSequence(
                            withSpring(1.05, { damping: 2 }),
                            withSpring(1, { damping: 2 })
                        ),
                        -1, true
                    );
                } catch (error) { console.error('Animation initialization error:', error); }
            });
        });
        return () => task.cancel();
    }, []);

    // Check for App Update / First Launch version
    useEffect(() => {
        checkVersion();
    }, []);

    const checkVersion = async () => {
        try {
            const currentVersion = Constants.expoConfig?.version || '1.0.0';
            const lastSeen = await AsyncStorage.getItem('lastSeenVersion');
            if (lastSeen !== currentVersion) {
                setShowWelcome(true);
            }
        } catch (e) { console.error('Version check error:', e); }
    };

    const handleCloseWelcome = async () => {
        try {
            const currentVersion = Constants.expoConfig?.version || '1.0.0';
            await AsyncStorage.setItem('lastSeenVersion', currentVersion);
            setShowWelcome(false);
        } catch (e) {
            console.error(e);
            setShowWelcome(false);
        }
    };

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

    const fetchWeather = async (latitude, longitude) => {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.current) return data.current;
            return null;
        } catch (error) {
            console.error('Error fetching weather:', error);
            return null;
        }
    };

    const getWeatherDescription = (code) => {
        if (code === 0) return 'Clear sky';
        if (code === 1 || code === 2 || code === 3) return 'Partly cloudy';
        if (code === 45 || code === 48) return 'Foggy';
        if (code >= 51 && code <= 67) return 'Rainy';
        if (code >= 71 && code <= 77) return 'Snowy';
        if (code >= 80 && code <= 82) return 'Showers';
        if (code >= 95) return 'Thunderstorm';
        return 'Clear';
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
                }
                return true;
            };
            const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => backHandler.remove();
        }, [])
    );

    // AppState listener
    useEffect(() => {
        const appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
            if (nextAppState === 'active') {
                const activeTimer = await getActiveTimer();
                if (activeTimer && activeTimer.endTimestamp) {
                    const now = Date.now();
                    const remaining = Math.max(0, Math.ceil((activeTimer.endTimestamp - now) / 1000));
                    if (remaining > 0) {
                        setEndTimestamp(activeTimer.endTimestamp);
                        setTimeLeft(remaining);
                        notificationIdRef.current = activeTimer.notificationId;
                        setHasStarted(true);
                        setIsActive(true);
                    } else {
                        await clearActiveTimer();
                        if (!hasStarted) handleTimerComplete();
                    }
                }
            }
        });
        return () => appStateSubscription.remove();
    }, [hasStarted]);

    // Schedule Daily Reminder
    useEffect(() => {
        const updateDailyNotification = async () => {
            try {
                const logs = await getSessionLogs();
                const today = new Date().toISOString().split('T')[0];
                const hasSessionToday = logs.some(log => log.date.startsWith(today));
                const scheduled = await getScheduledNotifications();
                const dailyId = scheduled.find(n => n.content?.title?.includes('Daily Sun Goal'))?.identifier;
                if (dailyId) await cancelNotification(dailyId);

                const content = hasSessionToday ? {
                    title: 'Daily Sun Goal 🌞',
                    body: 'Great job meeting your sunlight goal today!',
                } : {
                    title: 'Daily Sun Goal 🌙',
                    body: "You missed today's goal. Let's try again tomorrow!",
                };

                await scheduleDailyNotification(content.title, content.body, 18, 0);
            } catch (e) {
                console.log('Schedule error', e);
            }
        };
        updateDailyNotification();
    }, []);

    // Initialize data
    useEffect(() => {
        initializeData();
        const restoreTimer = async () => {
            const activeTimer = await getActiveTimer();
            if (activeTimer) {
                if (activeTimer.endTimestamp > Date.now()) {
                    setEndTimestamp(activeTimer.endTimestamp);
                    notificationIdRef.current = activeTimer.notificationId;
                    setHasStarted(true);
                    setIsActive(true);
                } else {
                    await clearActiveTimer();
                    setTimeout(() => handleTimerComplete(), 500);
                }
            }
        };
        restoreTimer();
    }, []);

    useFocusEffect(
        useCallback(() => { initializeData(); }, [])
    );

    useEffect(() => {
        if (uvIndex !== null && skinType !== null) {
            const newSafeTime = calculateSafeTime(uvIndex, skinType, isCloudy, hasSunscreen, vitDAdjust, isPhotosensitive);
            setSafeMinutes(newSafeTime);
            if (!hasStarted && !isActive) {
                setTimeLeft(newSafeTime * 60);
            }
        }
    }, [uvIndex, skinType, isCloudy, hasSunscreen, hasStarted, vitDAdjust, isPhotosensitive]);

    useEffect(() => {
        if (isActive && endTimestamp) {
            intervalRef.current = setInterval(() => {
                const remaining = Math.max(0, Math.ceil((endTimestamp - Date.now()) / 1000));
                setTimeLeft(remaining);
                if (remaining <= 0) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    handleTimerComplete();
                }
            }, 1000);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isActive, endTimestamp]);

    const initializeData = async () => {
        try {
            // Check Daily Limit logic
            if (auth.currentUser) {
                const userData = await fetchUserData(auth.currentUser.uid);
                const today = new Date().toISOString().split('T')[0];
                if (userData?.lastSessionDate === today) {
                    setDailyLimitReached(true);
                } else {
                    setDailyLimitReached(false);
                }

                // Load Global Preferences (Meds & Vitamin D Baseline)
                if (userData?.preferences) {
                    if (userData.preferences.photosensitiveMeds === true) {
                        setIsPhotosensitive(true);
                    } else {
                        setIsPhotosensitive(false);
                    }
                }
            }

            const settings = await getUserSettings();
            setSkinType(settings.skinType || 3);

            const prefs = await getDefaultPreferences();
            const hasSPF = prefs.sunscreen === true;
            setHasSunscreen(hasSPF);

            const manualUV = await getManualUV();
            if (manualUV !== null && manualUV !== undefined) {
                setUvIndex(manualUV);
                setIsManualData(true);
            }

            // VITAMIN D ADJUSTMENT CHECK
            let vitaminDAdjustment = 0;
            if (auth.currentUser) {
                try {
                    const { collection, query, where, orderBy, limit, getDocs } = require('firebase/firestore');
                    const { db } = require('../config/firebase');

                    const reportsRef = collection(db, 'vitaminDReports');
                    const q = query(
                        reportsRef,
                        where('userId', '==', auth.currentUser.uid),
                        orderBy('date', 'desc'),
                        limit(1)
                    );
                    const snapshot = await getDocs(q);
                    if (!snapshot.empty) {
                        const report = snapshot.docs[0].data();
                        if (report.adjustment) {
                            vitaminDAdjustment = report.adjustment;
                        }
                    } else if (auth.currentUser) {
                        // Fallback to Preferences Baseline if no report
                        const userData = await fetchUserData(auth.currentUser.uid);
                        if (userData?.preferences?.baselineVitaminD) {
                            const baselineStatus = getVitaminDStatus(userData.preferences.baselineVitaminD);
                            vitaminDAdjustment = baselineStatus.adjustment;
                        }
                    }
                } catch (e) {
                    // Fallback for missing index
                    if (e.code === 'failed-precondition' || e.message?.includes('index')) {
                        try {
                            const { collection, query, where, getDocs } = require('firebase/firestore');
                            const { db } = require('../config/firebase');
                            const reportsRef = collection(db, 'vitaminDReports');
                            const qFallback = query(reportsRef, where('userId', '==', auth.currentUser.uid));
                            const snapshot = await getDocs(qFallback);
                            if (!snapshot.empty) {
                                const docs = snapshot.docs.map(doc => doc.data());
                                docs.sort((a, b) => new Date(b.date) - new Date(a.date));
                                if (docs[0].adjustment) {
                                    vitaminDAdjustment = docs[0].adjustment;
                                }
                            }
                        } catch (fallbackError) {
                            console.log('Vitamin D fallback failed', fallbackError);
                        }
                    } else {
                        console.log('Error fetching Vitamin D report:', e);
                    }
                }
            }

            // Store adjustment in state if you want to show it in UI (optional, for now just using in calculation)
            // But we need to use it in the calculation effect
            // Let's modify the calculation effect slightly or state to include it.
            // Best way: add a state for it
            setVitDAdjust(vitaminDAdjustment);

            setIsManualData(false);

            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Location Permission Required');
                setUvIndex(5);
                setLoading(false);
                return;
            }

            const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = currentLocation.coords;

            // Parallelize data fetching for performance
            const [uv, weatherData, addresses] = await Promise.all([
                fetchUVIndex(latitude, longitude),
                fetchWeather(latitude, longitude),
                Location.reverseGeocodeAsync({ latitude, longitude }).catch(e => {
                    console.error('Geocoding error:', e);
                    return null;
                })
            ]);

            if (uv !== null) setUvIndex(uv);
            else {
                if (Platform.OS === 'android') ToastAndroid.show('Could not fetch UV data.', ToastAndroid.LONG);
                setUvIndex(5);
            }

            if (weatherData) setWeather(weatherData);

            if (addresses && addresses.length > 0) {
                const addr = addresses[0];
                setCity(addr.city || addr.region || addr.country || 'Unknown Location');
            } else {
                setCity('Unknown Location');
            }

            setLoading(false);
        } catch (error) {
            console.error('Error initializing data:', error);
            setUvIndex(5);
            setLoading(false);
        }
    };

    const handleTimerComplete = async () => {
        setIsActive(false);
        setIsSessionComplete(true);
        if (intervalRef.current) clearInterval(intervalRef.current);

        // DAILY LIMIT REACHED
        setDailyLimitReached(true);
        const today = new Date().toISOString().split('T')[0];

        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) { }

        await clearActiveTimer();

        try {
            if (notificationIdRef.current) {
                await cancelNotification(notificationIdRef.current);
                notificationIdRef.current = null;
            }
            await scheduleImmediateNotification(
                '☀️ Session Complete!',
                'Daily goal reached! See you tomorrow.'
            );
        } catch (error) { console.error('Notification error:', error); }

        if (auth.currentUser) {
            const exposureResult = calculateExposureScore(safeMinutes, uvIndex, skinType, hasSunscreen, isCloudy);

            // Save Session
            await saveSessionToFirestore(auth.currentUser.uid, {
                uvIndex,
                duration: safeMinutes,
                skinType,
                sunscreen: hasSunscreen,
                cloudy: isCloudy,
                exposureScore: exposureResult.score,
                rawExposure: exposureResult.rawExposure,
                exposureStatus: exposureResult.status,
                recommendation: exposureResult.recommendation,
                date: new Date().toISOString(),
            });

            // Update user Daily Limit
            await saveUserToFirestore(auth.currentUser.uid, {
                lastSessionDate: today
            });
        }

        Alert.alert(
            "Daily Limit Reached",
            "You have reached your safe sun exposure limit for today. Come back tomorrow!",
            [{ text: "OK" }]
        );
    };

    const startTimer = async () => {
        if (dailyLimitReached) {
            Alert.alert("Daily Limit Reached", "You have already completed a session today.");
            return;
        }

        const endTime = Date.now() + (timeLeft * 1000);
        setEndTimestamp(endTime);
        setIsActive(true);
        setHasStarted(true);

        try {
            if (notificationIdRef.current) await cancelNotification(notificationIdRef.current);

            const id = await scheduleNotificationAtDate(
                '⏰ Time\'s Up!',
                'Your safe sun exposure time is complete.',
                new Date(endTime)
            );
            notificationIdRef.current = id;
            await setActiveTimer(endTime, id);

            await scheduleImmediateNotification(
                'Sun Timer Running ☀️',
                `Ends at ${new Date(endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`,
                { sound: false }
            );
        } catch (e) { console.error('Notification scheduling error:', e); }
    };

    const stopTimer = async () => {
        setIsActive(false);
        setEndTimestamp(null);
        await clearActiveTimer();
        if (notificationIdRef.current) {
            await cancelNotification(notificationIdRef.current);
            notificationIdRef.current = null;
        }
    };

    const resetTimer = async () => {
        setIsActive(false);
        setEndTimestamp(null);
        setHasStarted(false);
        setIsSessionComplete(false);
        await clearActiveTimer();
        setTimeLeft(safeMinutes * 60);
        if (notificationIdRef.current) {
            await cancelNotification(notificationIdRef.current);
            notificationIdRef.current = null;
        }
    };

    const handleStartNewSession = async () => {
        if (dailyLimitReached) {
            Alert.alert("Daily Limit Reached", "You have already completed a session today.");
            return;
        }
        setIsSessionComplete(false);
        setHasStarted(false);
        setTimeLeft(safeMinutes * 60);
        setTimeout(() => { startTimer(); }, 300);
    };

    const handleDismissOverlay = () => {
        setIsSessionComplete(false);
        setHasStarted(false);
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
                opacity={isDark ? 0.8 : 0.3}
            />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
                    <Animated.Text entering={ZoomIn.duration(800)} style={styles.logo}>Suntime</Animated.Text>
                </Animated.View>

                {/* Weather Card */}
                <Animated.View entering={FadeInRight.delay(200)} style={styles.weatherCard}>
                    <LinearGradient
                        colors={isDark ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'] : ['#FFFFFF', '#F0F2F5']}
                        style={styles.weatherGradient}
                    >
                        <View style={styles.weatherMain}>
                            <View>
                                <View style={styles.locationRow}>
                                    <MapPin size={14} color={colors.primary} style={{ marginRight: 4 }} />
                                    <Text style={styles.cityText}>{city}</Text>
                                </View>
                                <Text style={styles.tempText}>
                                    {weather ? Math.round(weather.temperature_2m) : '--'}°
                                </Text>
                                <Text style={styles.conditionText}>
                                    {weather ? getWeatherDescription(weather.weather_code) : 'Loading...'}
                                </Text>
                            </View>
                            <View style={styles.weatherStats}>
                                <View style={styles.weatherStatItem}>
                                    <Wind size={14} color={colors.textSecondary} />
                                    <Text style={styles.weatherStatValue}>
                                        {weather ? Math.round(weather.wind_speed_10m) : '-'} km/h
                                    </Text>
                                </View>
                                <View style={styles.weatherStatItem}>
                                    <Droplets size={14} color={colors.textSecondary} />
                                    <Text style={styles.weatherStatValue}>
                                        {weather ? weather.relative_humidity_2m : '-'}%
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* UV Scale */}
                <View style={styles.scaleContainer}>
                    <Text style={styles.scaleLabel}>UV Spectrum</Text>
                    <View style={styles.uvScale}>
                        {UV_SCALE_NUMBERS.map((num) => {
                            const isSelected = uvIndex !== null && (num === 11 ? uvIndex >= 11 : Math.round(uvIndex) === num);
                            return (
                                <View key={num} style={[styles.scaleItem, { backgroundColor: getScaleColor(num) }, isSelected && styles.scaleItemActive]}>
                                    <Text style={[styles.scaleText, isSelected && styles.scaleTextActive]}>{num}{num === 11 ? '+' : ''}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* UV Widget */}
                <Animated.View entering={FadeInDown} style={styles.uvWidgetContainer}>
                    <LinearGradient colors={GRADIENTS.darkCard} style={styles.uvWidgetGradient}>
                        <Animated.View style={[styles.uvInfo, animatedUVStyle]}>
                            <Text style={[styles.uvLabel, { color: COLORS.white }]}>{isManualData ? 'MANUAL UV' : 'UV INDEX'}</Text>
                            <Text style={[styles.uvValue, { color: uvCategory.color }]}>{(uvIndex || 0).toFixed(1)}</Text>
                            <Text style={[styles.uvLevel, { color: uvCategory.color }]}>{uvCategory.level}</Text>
                        </Animated.View>
                    </LinearGradient>
                </Animated.View>

                {/* Timer */}
                <Animated.View entering={ZoomIn} style={styles.timerContainer}>
                    <View style={styles.waterTimerWrapper}>
                        <SunTimer
                            progress={isSessionComplete || dailyLimitReached ? 100 : Math.max(0, 100 - progress)}
                            size={moderateScale(240)}
                            isActive={isActive}
                        />
                        <View style={styles.timerTextOverlay}>
                            {isSessionComplete || dailyLimitReached ? (
                                <>
                                    <Text style={[styles.timerTime, { fontSize: moderateScale(48), color: dailyLimitReached ? '#F44336' : '#4CAF50' }]}>
                                        00:00
                                    </Text>
                                    <Text style={styles.timerLabel}>
                                        {dailyLimitReached ? 'Daily Limit Reached' : 'Session Finished'}
                                    </Text>
                                </>
                            ) : timeLeft > 0 ? (
                                <>
                                    <Text style={styles.timerTime}>{formattedTime}</Text>
                                    <Text style={styles.timerLabel}>{isActive ? 'Time Remaining' : hasStarted ? 'Paused' : 'Safe Time'}</Text>
                                </>
                            ) : null}
                        </View>
                    </View>

                    {/* Controls */}
                    <View style={styles.controlsContainer}>
                        {!isActive ? (
                            <TouchableOpacity onPress={startTimer} style={styles.shadowButtonWrapper} disabled={dailyLimitReached}>
                                <LinearGradient
                                    colors={dailyLimitReached ? ['#B0B0B0', '#9E9E9E'] : GRADIENTS.primary}
                                    style={styles.startButton}
                                >
                                    <Text style={styles.buttonText}>
                                        {dailyLimitReached ? 'Limit Reached' : hasStarted ? 'Resume' : 'Start Timer'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.activeControls}>
                                <StandardButton title="Pause" onPress={stopTimer} style={{ flex: 1 }} />
                                <StandardButton title="Reset" onPress={resetTimer} variant="secondary" style={{ flex: 1, backgroundColor: colors.textSecondary }} />
                            </View>
                        )}
                    </View>
                </Animated.View>

                {/* Toggles */}
                <View style={styles.togglesContainer}>
                    <TouchableOpacity
                        style={[styles.toggle, isCloudy && styles.toggleActive, isActive && { opacity: 0.5 }]}
                        onPress={() => !isActive && setIsCloudy(!isCloudy)}
                        disabled={isActive || dailyLimitReached}
                    >
                        <CloudRain size={24} color={isCloudy ? COLORS.white : colors.textSecondary} />
                        <Text style={[styles.toggleText, isCloudy && styles.toggleTextActive]}>Cloudy</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.toggle, hasSunscreen && styles.toggleActive, isActive && { opacity: 0.5 }]}
                        onPress={() => !isActive && setHasSunscreen(!hasSunscreen)}
                        disabled={isActive || dailyLimitReached}
                    >
                        <ShieldCheck size={24} color={hasSunscreen ? COLORS.white : colors.textSecondary} />
                        <Text style={[styles.toggleText, hasSunscreen && styles.toggleTextActive]}>Sunscreen</Text>
                    </TouchableOpacity>
                </View>

                {/* Tips */}
                <View style={styles.tipsContainer}>
                    <Text style={styles.tipsTitle}>Sun Safety Tip</Text>
                    <Text style={styles.tipsText}>
                        {uvIndex > 3
                            ? "UV is moderate to high. Wear sunscreen and a hat."
                            : "UV is low. You can safely enjoy some sun exposure."}
                    </Text>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <WelcomeModal visible={showWelcome} onClose={handleCloseWelcome} />

            {/* Session Complete Overlay */}
            <SessionCompleteOverlay
                visible={isSessionComplete}
                onDismiss={handleDismissOverlay}
                onStartNew={handleStartNewSession}
                stats={{
                    duration: safeMinutes,
                    uvIndex: uvIndex,
                    score: calculateExposureScore(safeMinutes, uvIndex, skinType, hasSunscreen, isCloudy).score
                }}
            />
        </SafeAreaView>
    );
}

// Icon for toggle
import { ShieldCheck } from 'lucide-react-native';

const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        padding: SPACING.md,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: SPACING.md,
        color: colors.textSecondary,
        fontSize: moderateScale(16),
    },
    header: {
        marginTop: SPACING.sm,
        marginBottom: SPACING.lg,
        alignItems: 'center',
    },
    logo: {
        fontSize: moderateScale(32),
        fontWeight: '800',
        color: colors.text,
        letterSpacing: -1,
        textShadowColor: 'rgba(0,0,0,0.1)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    weatherCard: {
        width: '100%',
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        marginBottom: SPACING.lg, // Reduced for screenshot readiness
        ...SHADOWS.medium,
    },
    weatherGradient: {
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    weatherMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    cityText: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '600',
        color: colors.text,
        fontSize: moderateScale(16),
    },
    tempText: {
        fontSize: moderateScale(36),
        fontWeight: 'bold',
        color: colors.text,
    },
    conditionText: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
    },
    weatherStats: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.lg,
        gap: SPACING.sm,
    },
    weatherStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    weatherStatValue: {
        ...TYPOGRAPHY.caption,
        fontWeight: '600',
        color: colors.text,
    },
    scaleContainer: {
        width: '100%',
        marginBottom: SPACING.lg,
    },
    scaleLabel: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        marginBottom: SPACING.sm,
        fontWeight: '600',
        marginLeft: SPACING.xs,
    },
    uvScale: {
        flexDirection: 'row',
        gap: 4,
        paddingHorizontal: SPACING.xs,
        paddingVertical: SPACING.xs,
        justifyContent: 'center',
        flexWrap: 'wrap',
    },
    scaleItem: {
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scaleItemActive: {
        transform: [{ scale: 1.2 }],
        borderWidth: 2,
        borderColor: colors.text,
        elevation: 4,
        zIndex: 10,
    },
    scaleText: {
        fontSize: moderateScale(10),
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    scaleTextActive: {
        fontSize: moderateScale(11),
    },
    uvWidgetContainer: {
        width: '100%',
        marginBottom: SPACING.lg, // Reduced for screenshot readiness
        borderRadius: BORDER_RADIUS.xl,
        ...SHADOWS.large,
        elevation: 10,
    },
    uvWidgetGradient: {
        padding: SPACING.xl,
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        minHeight: 160,
        justifyContent: 'center',
    },
    uvInfo: {
        alignItems: 'center',
    },
    uvLabel: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        letterSpacing: 2,
        opacity: 0.9,
        marginBottom: SPACING.xs,
    },
    uvValue: {
        fontSize: moderateScale(80),
        fontWeight: '900',
        lineHeight: 80,
        marginVertical: SPACING.xs,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
    },
    uvLevel: {
        fontSize: moderateScale(24),
        fontWeight: '700',
        letterSpacing: 1,
    },
    timerContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    waterTimerWrapper: {
        width: moderateScale(240),
        height: moderateScale(240),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    timerTextOverlay: {
        position: 'absolute',
        alignItems: 'center',
    },
    timerTime: {
        fontSize: moderateScale(48),
        fontWeight: '700',
        color: colors.text,
        fontVariant: ['tabular-nums'],
    },
    timerLabel: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        marginTop: SPACING.xs,
        fontSize: moderateScale(14),
    },
    controlsContainer: {
        width: '100%',
        paddingHorizontal: SPACING.xl,
    },
    shadowButtonWrapper: {
        ...SHADOWS.large,
        borderRadius: BORDER_RADIUS.full,
    },
    startButton: {
        paddingVertical: 18,
        borderRadius: BORDER_RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: COLORS.white,
        fontSize: moderateScale(18),
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    activeControls: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    togglesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: SPACING.xl,
    },
    toggle: {
        alignItems: 'center',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: colors.cardBackground,
        width: '45%',
        borderWidth: 1,
        borderColor: colors.border,
        gap: SPACING.xs,
    },
    toggleActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    toggleText: {
        fontWeight: '600',
        color: colors.textSecondary,
        fontSize: moderateScale(14),
    },
    toggleTextActive: {
        color: COLORS.white,
    },
    tipsContainer: {
        width: '100%',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
        marginBottom: SPACING.xl,
    },
    tipsTitle: {
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 4,
        fontSize: moderateScale(14),
    },
    tipsText: {
        color: colors.text,
        fontSize: moderateScale(13),
        lineHeight: 20,
    },
});
