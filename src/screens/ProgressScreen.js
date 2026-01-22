import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ZoomIn, FadeInRight } from 'react-native-reanimated';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale, GRADIENTS, GLASS, COLORS } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchSessions } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import { calculateDailyExposureScore } from '../utils/sunLogic';
import { ArrowLeft, AlertCircle, TrendingUp, Sun, Plus, Activity } from 'lucide-react-native';
import { db } from '../config/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import VitaminDUploadModal from '../components/VitaminDUploadModal';

export default function ProgressScreen() {
    const navigation = useNavigation();
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    const [todayMinutes, setTodayMinutes] = useState(0);
    const [weeklyStreak, setWeeklyStreak] = useState(0);
    const [monthlyTotal, setMonthlyTotal] = useState(0);
    const [totalSessions, setTotalSessions] = useState(0);
    const [averagePerDay, setAveragePerDay] = useState(0);
    const [loading, setLoading] = useState(true);

    // Vitamin D State
    const [vitaminData, setVitaminData] = useState(null); // { value, date }
    const [showVitaminModal, setShowVitaminModal] = useState(false);

    // Exposure Score State
    const [exposureData, setExposureData] = useState({
        score: 0,
        status: 'No Exposure',
        color: '#9E9E9E',
        statusEmoji: '💤',
        recommendation: { message: '', shortMessage: '', icon: '', priority: 'low' }
    });

    useEffect(() => {
        if (user) loadProgress();
    }, [user]);

    useFocusEffect(
        React.useCallback(() => {
            if (user) loadProgress();
        }, [user])
    );

    const loadProgress = async () => {
        try {
            setLoading(true);
            if (!user) {
                setLoading(false);
                return;
            }

            // Parallel fetch: Sessions + Vitamin D
            const [logs, vitaminSnapshot] = await Promise.all([
                fetchSessions(user.uid),
                fetchVitaminD(user.uid)
            ]);

            // Process Vitamin D
            if (!vitaminSnapshot.empty) {
                const doc = vitaminSnapshot.docs[0].data();
                setVitaminData({
                    value: doc.value,
                    date: new Date(doc.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                });
            } else {
                setVitaminData(null);
            }

            if (!logs || logs.length === 0) {
                setLoading(false);
                return;
            }

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // Calculate today's sessions and minutes
            const todaySessions = logs.filter(log => {
                const logDate = new Date(log.date);
                const logDay = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());
                return logDay.getTime() === today.getTime();
            });
            const todayMins = todaySessions.reduce((sum, log) => sum + (log.exposureTime || log.duration || 0), 0);
            setTodayMinutes(todayMins);

            // Calculate Exposure Score for today
            const dailyExposure = calculateDailyExposureScore(todaySessions);
            setExposureData(dailyExposure);

            // Calculate weekly streak (consecutive days with sessions)
            let streak = 0;
            let checkDate = new Date(today);
            for (let i = 0; i < 7; i++) {
                const dayLogs = logs.filter(log => {
                    const logDate = new Date(log.date);
                    const logDay = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());
                    return logDay.getTime() === checkDate.getTime();
                });
                if (dayLogs.length > 0) {
                    streak++;
                } else {
                    break;
                }
                checkDate.setDate(checkDate.getDate() - 1);
            }
            setWeeklyStreak(streak);

            // Calculate monthly total
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthSessions = logs.filter(log => {
                const logDate = new Date(log.date);
                return logDate >= firstDayOfMonth;
            });
            const monthMins = monthSessions.reduce((sum, log) => sum + (log.exposureTime || log.duration || 0), 0);
            setMonthlyTotal(monthMins);

            // Calculate average per day (total minutes / number of days with sessions)
            const uniqueDays = new Set();
            logs.forEach(log => {
                const logDate = new Date(log.date);
                const dayKey = `${logDate.getFullYear()}-${logDate.getMonth()}-${logDate.getDate()}`;
                uniqueDays.add(dayKey);
            });
            const totalMinutes = logs.reduce((sum, log) => sum + (log.exposureTime || log.duration || 0), 0);
            const avgPerDay = uniqueDays.size > 0 ? Math.round(totalMinutes / uniqueDays.size) : 0;
            setAveragePerDay(avgPerDay);

            setTotalSessions(logs.length);
        } catch (error) {
            console.error('Error loading progress:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchVitaminD = async (uid) => {
        try {
            const reportsRef = collection(db, 'vitaminDReports');
            const q = query(
                reportsRef,
                where('userId', '==', uid),
                orderBy('date', 'desc'),
                limit(1)
            );
            return await getDocs(q);
        } catch (e) {
            console.error('VitD fetch error', e);
            return { empty: true };
        }
    };

    // Get status colors and styles
    const getStatusStyle = (priority) => {
        switch (priority) {
            case 'optimal':
                return { bg: 'rgba(76, 175, 80, 0.15)', border: '#4CAF50' };
            case 'caution':
                return { bg: 'rgba(255, 152, 0, 0.15)', border: '#FF9800' };
            case 'warning':
                return { bg: 'rgba(244, 67, 54, 0.15)', border: '#F44336' };
            default:
                return { bg: 'rgba(33, 150, 243, 0.15)', border: '#2196F3' };
        }
    };

    const statusStyle = getStatusStyle(exposureData.recommendation?.priority);

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={isDark ? GRADIENTS.night : GRADIENTS.sunrise}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                opacity={isDark ? 0.8 : 0.3}
            />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <Animated.View entering={FadeInDown} style={styles.header}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backButton}>
                            <ArrowLeft color={colors.text} size={24} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.title}>Your Progress</Text>
                    <Text style={styles.subtitle}>Track your safe sun exposure & health</Text>
                </Animated.View>

                {/* Vitamin D Card - NEW */}
                <Animated.View entering={ZoomIn} style={styles.vitaminCard}>
                    <LinearGradient
                        colors={isDark ? ['#FFAB0030', '#FFAB0010'] : ['#FFF8E1', '#FFFFFF']}
                        style={styles.vitaminGradient}
                    >
                        <View style={styles.vitaminHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Activity size={20} color="#FFAB00" style={{ marginRight: 8 }} />
                                <Text style={styles.vitaminTitle}>Vitamin D Level</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowVitaminModal(true)}
                                style={styles.addButton}
                            >
                                <Plus size={20} color={COLORS.white} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.vitaminContent}>
                            {vitaminData ? (
                                <View>
                                    <Text style={styles.vitaminValue}>
                                        {vitaminData.value} <Text style={styles.vitaminUnit}>ng/mL</Text>
                                    </Text>
                                    <Text style={styles.vitaminDate}>Last updated: {vitaminData.date}</Text>
                                </View>
                            ) : (
                                <Text style={styles.vitaminPlaceholder}>
                                    No records yet. Tap + to add.
                                </Text>
                            )}
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Exposure Score Card */}
                <Animated.View
                    entering={ZoomIn.delay(100)}
                    style={styles.exposureScoreCard}
                >
                    <LinearGradient
                        colors={[exposureData.color + '20', exposureData.color + '05']}
                        style={styles.exposureGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.exposureHeader}>
                            <Text style={styles.exposureTitle}>Today's Exposure Score</Text>
                            <View style={[styles.statusBadge, { backgroundColor: exposureData.color }]}>
                                <Text style={styles.statusBadgeText}>{exposureData.status}</Text>
                            </View>
                        </View>

                        {/* Score Circle */}
                        <View style={styles.scoreContainer}>
                            <View style={[styles.scoreCircle, { borderColor: exposureData.color }]}>
                                <Text style={[styles.scoreNumber, { color: exposureData.color }]}>
                                    {exposureData.score}
                                </Text>
                                <Text style={styles.scoreLabel}>/ 100</Text>
                            </View>
                            <Text style={styles.scoreEmoji}>{exposureData.statusEmoji}</Text>
                        </View>

                        {/* Score Bar */}
                        <View style={styles.scoreBarContainer}>
                            <View style={styles.scoreBarBackground}>
                                <View style={styles.scoreBarSegments}>
                                    <View style={[styles.segment, { flex: 40, backgroundColor: '#2196F3' }]} />
                                    <View style={[styles.segment, { flex: 40, backgroundColor: '#4CAF50' }]} />
                                    <View style={[styles.segment, { flex: 20, backgroundColor: '#FF9800' }]} />
                                </View>
                                <View
                                    style={[
                                        styles.scoreIndicator,
                                        { left: `${Math.min(exposureData.score, 100)}%` }
                                    ]}
                                />
                            </View>
                            <View style={styles.scoreLabels}>
                                <Text style={styles.scoreLabelText}>Low</Text>
                                <Text style={styles.scoreLabelText}>Optimal</Text>
                                <Text style={styles.scoreLabelText}>High</Text>
                            </View>
                        </View>

                        <View style={styles.durationRow}>
                            <Sun size={16} color={colors.textSecondary} />
                            <Text style={styles.durationText}>
                                {todayMinutes} minutes of exposure today
                            </Text>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Recommendation Card */}
                <Animated.View
                    entering={FadeInDown.delay(200)}
                    style={[
                        styles.recommendationCard,
                        { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }
                    ]}
                >
                    <View style={styles.recommendationHeader}>
                        <Text style={styles.recommendationIcon}>
                            {exposureData.recommendation?.icon}
                        </Text>
                        <Text style={styles.recommendationTitle}>Recommendation</Text>
                    </View>
                    <Text style={styles.recommendationText}>
                        {exposureData.recommendation?.message}
                    </Text>
                </Animated.View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <Animated.View entering={FadeInRight.delay(300)} style={styles.statCard}>
                        <Text style={styles.statNumber}>{weeklyStreak}</Text>
                        <Text style={styles.statLabel}>Day Streak</Text>
                    </Animated.View>

                    <Animated.View entering={FadeInRight.delay(400)} style={styles.statCard}>
                        <Text style={styles.statNumber}>{monthlyTotal}</Text>
                        <Text style={styles.statLabel}>Monthly Minutes</Text>
                    </Animated.View>
                </View>

                {/* All-Time Stats */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>All-Time Statistics</Text>
                    <View style={styles.statRow}>
                        <Text style={styles.statRowLabel}>Total Sessions</Text>
                        <Text style={styles.statRowValue}>{totalSessions}</Text>
                    </View>
                    <View style={styles.statRow}>
                        <Text style={styles.statRowLabel}>Average per Day</Text>
                        <Text style={styles.statRowValue}>{averagePerDay} min</Text>
                    </View>
                </View>

                {/* Tips Card */}
                <View style={styles.tipsCard}>
                    <View style={styles.tipsHeader}>
                        <TrendingUp size={20} color={colors.primary} />
                        <Text style={styles.tipsTitle}>Understanding Your Score</Text>
                    </View>
                    <Text style={styles.tipsText}>
                        • <Text style={{ color: '#2196F3', fontWeight: '600' }}>0-40:</Text> Low exposure - consider more outdoor time{'\n'}
                        • <Text style={{ color: '#4CAF50', fontWeight: '600' }}>40-80:</Text> Optimal - great for Vitamin D{'\n'}
                        • <Text style={{ color: '#FF9800', fontWeight: '600' }}>80-120:</Text> High - use protection{'\n'}
                        • <Text style={{ color: '#F44336', fontWeight: '600' }}>120+:</Text> Excessive - avoid
                    </Text>
                </View>

                <View style={styles.disclaimer}>
                    <AlertCircle size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={styles.disclaimerText}>
                        This is an estimation for awareness only, not medical advice. Always consult healthcare professionals.
                    </Text>
                </View>
            </ScrollView>

            <VitaminDUploadModal
                visible={showVitaminModal}
                onClose={() => setShowVitaminModal(false)}
                onUploadSuccess={() => loadProgress()}
            />
        </SafeAreaView>
    );
}

const getStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: moderateScale(100),
    },
    header: {
        marginBottom: SPACING.xl,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    backButton: {
        padding: SPACING.sm,
        marginLeft: -SPACING.sm,
    },
    title: {
        ...TYPOGRAPHY.title,
        color: colors.text,
        marginBottom: SPACING.xs,
    },
    subtitle: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
    },
    // Vitamin Card
    vitaminCard: {
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        marginBottom: SPACING.lg,
        ...SHADOWS.medium,
        backgroundColor: colors.cardBackground,
    },
    vitaminGradient: {
        padding: SPACING.lg,
    },
    vitaminHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    vitaminTitle: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '700',
        color: colors.text,
    },
    addButton: {
        backgroundColor: '#FFAB00',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    vitaminContent: {
        paddingLeft: SPACING.xs,
    },
    vitaminValue: {
        fontSize: moderateScale(28),
        fontWeight: 'bold',
        color: colors.text,
    },
    vitaminUnit: {
        fontSize: moderateScale(16),
        fontWeight: 'normal',
        color: colors.textSecondary,
    },
    vitaminDate: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        marginTop: 4,
    },
    vitaminPlaceholder: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    // Exposure Score Card
    exposureScoreCard: {
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        marginBottom: SPACING.lg,
        ...SHADOWS.medium,
    },
    exposureGradient: {
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    exposureHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    exposureTitle: {
        ...TYPOGRAPHY.subheading,
        color: colors.text,
        fontWeight: '700',
    },
    statusBadge: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.full,
    },
    statusBadgeText: {
        ...TYPOGRAPHY.caption,
        color: '#FFF',
        fontWeight: '700',
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
    },
    scoreCircle: {
        width: moderateScale(120),
        height: moderateScale(120),
        borderRadius: moderateScale(60),
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.cardBackground,
    },
    scoreNumber: {
        fontSize: moderateScale(36),
        fontWeight: '800',
    },
    scoreLabel: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
    },
    scoreEmoji: {
        fontSize: moderateScale(48),
        marginLeft: SPACING.lg,
    },
    scoreBarContainer: {
        marginBottom: SPACING.md,
    },
    scoreBarBackground: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
    },
    scoreBarSegments: {
        flexDirection: 'row',
        height: '100%',
    },
    segment: {
        height: '100%',
    },
    scoreIndicator: {
        position: 'absolute',
        top: -4,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.text,
        borderWidth: 3,
        borderColor: colors.cardBackground,
        marginLeft: -8,
    },
    scoreLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: SPACING.xs,
    },
    scoreLabelText: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        fontSize: moderateScale(10),
    },
    durationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.sm,
    },
    durationText: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
        marginLeft: SPACING.xs,
    },
    // Recommendation Card
    recommendationCard: {
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        marginBottom: SPACING.lg,
    },
    recommendationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    recommendationIcon: {
        fontSize: moderateScale(24),
        marginRight: SPACING.sm,
    },
    recommendationTitle: {
        ...TYPOGRAPHY.subheading,
        color: colors.text,
        fontWeight: '700',
    },
    recommendationText: {
        ...TYPOGRAPHY.body,
        color: colors.text,
        lineHeight: moderateScale(22),
    },
    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.lg,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        alignItems: 'center',
        ...SHADOWS.small,
        ...(isDark ? GLASS.dark : GLASS.default),
    },
    statNumber: {
        fontSize: moderateScale(32),
        fontWeight: '800',
        color: colors.primary,
    },
    statLabel: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        marginTop: SPACING.xs,
    },
    // Cards
    card: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        ...SHADOWS.small,
        ...(isDark ? GLASS.dark : GLASS.default),
    },
    cardTitle: {
        ...TYPOGRAPHY.subheading,
        color: colors.text,
        fontWeight: '700',
        marginBottom: SPACING.md,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    statRowLabel: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
    },
    statRowValue: {
        ...TYPOGRAPHY.body,
        color: colors.text,
        fontWeight: '600',
    },
    // Tips Card
    tipsCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
        ...SHADOWS.small,
        ...(isDark ? GLASS.dark : GLASS.default),
    },
    tipsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    tipsTitle: {
        ...TYPOGRAPHY.subheading,
        color: colors.text,
        fontWeight: '700',
        marginLeft: SPACING.sm,
    },
    tipsText: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
        lineHeight: moderateScale(24),
    },
    // Disclaimer
    disclaimer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.backgroundLight,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.lg,
    },
    disclaimerText: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        flex: 1,
        lineHeight: moderateScale(18),
    },
});
