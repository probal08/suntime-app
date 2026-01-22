import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale, GLASS } from '../../constants/theme';
import { Pill, AlertTriangle, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { savePreferences } from '../../services/firestore';
import StandardButton from '../../components/common/StandardButton';

export default function SetupStepPrescription({ navigation }) {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    // Default to false (not taking meds)
    const [takingMeds, setTakingMeds] = useState(false);

    const handleContinue = async () => {
        try {
            if (user) {
                // Save medication preference
                await savePreferences(user.uid, {
                    photosensitiveMeds: takingMeds
                });
            }
        } catch (error) {
            console.error('Error saving prescription preference:', error);
            // Don't block
        }

        navigation.navigate('SetupStep4');
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginBottom: SPACING.md, alignSelf: 'flex-start' }}
                >
                    <ArrowLeft color={colors.text} size={24} />
                </TouchableOpacity>

                {/* Progress Indicator */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '83%' }]} />
                    </View>
                    <Text style={styles.progressText}>Step 5 of 6</Text>
                </View>

                {/* Header */}
                <Animated.View entering={FadeInDown} style={styles.header}>
                    <Pill color={colors.primary} size={moderateScale(64)} style={{ marginBottom: SPACING.md }} />
                    <Text style={styles.title}>Prescriptions & Meds</Text>
                    <Text style={styles.subtitle}>
                        Certain medications can make your skin much more sensitive to sunlight.
                    </Text>
                </Animated.View>

                {/* Content */}
                <Animated.View entering={FadeInDown.delay(100)} style={styles.card}>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.questionText}>
                                Are you currently taking any medications?
                            </Text>
                            <Text style={styles.descriptionText}>
                                Antibiotics, Retinoids (Acne), Antihistamines, etc.
                            </Text>
                        </View>
                        <Switch
                            value={takingMeds}
                            onValueChange={setTakingMeds}
                            trackColor={{ false: colors.backgroundLight, true: colors.primary }}
                            thumbColor={'#fff'}
                        />
                    </View>

                    {takingMeds && (
                        <Animated.View entering={FadeInDown} style={styles.warningBox}>
                            <AlertTriangle color="#E65100" size={24} style={{ marginRight: SPACING.sm }} />
                            <Text style={styles.warningText}>
                                Caution: We will recommend shorter exposure times to prevent burns.
                            </Text>
                        </Animated.View>
                    )}
                </Animated.View>

                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>Common Photosensitizing Drugs:</Text>
                    <Text style={styles.infoList}>
                        • Tetracycline, Doxycycline (Antibiotics){'\n'}
                        • Isotretinoin/Accutane (Acne){'\n'}
                        • Ibuprofen/Naproxen (Anti-inflammatory){'\n'}
                        • Diuretics (Blood pressure)
                    </Text>
                </View>

                <StandardButton
                    title="Continue"
                    onPress={handleContinue}
                    style={{ marginTop: SPACING.xl }}
                />

            </ScrollView>
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
        paddingBottom: SPACING.xxl,
    },
    progressContainer: {
        marginBottom: SPACING.xl,
    },
    progressBar: {
        height: moderateScale(6),
        backgroundColor: colors.backgroundLight,
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
    },
    progressText: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        marginTop: SPACING.xs,
        textAlign: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    title: {
        ...TYPOGRAPHY.title,
        textAlign: 'center',
        marginBottom: SPACING.sm,
        color: colors.text,
    },
    subtitle: {
        ...TYPOGRAPHY.body,
        textAlign: 'center',
        color: colors.textSecondary,
        paddingHorizontal: SPACING.md,
    },
    card: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        ...SHADOWS.small,
        marginBottom: SPACING.lg,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    questionText: {
        ...TYPOGRAPHY.subheading,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: SPACING.xs,
    },
    descriptionText: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        paddingRight: SPACING.md,
    },
    warningBox: {
        marginTop: SPACING.md,
        padding: SPACING.md,
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        borderRadius: BORDER_RADIUS.md,
        flexDirection: 'row',
        alignItems: 'center',
    },
    warningText: {
        ...TYPOGRAPHY.caption,
        color: '#E65100',
        flex: 1,
        fontWeight: '600',
    },
    infoBox: {
        padding: SPACING.md,
    },
    infoTitle: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        color: colors.text,
        marginBottom: SPACING.sm,
    },
    infoList: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        lineHeight: 22,
    }
});
