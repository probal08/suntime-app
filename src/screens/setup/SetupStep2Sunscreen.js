import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
    Platform
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale } from '../../constants/theme';
import { Shield, Check, Sun } from 'lucide-react-native';
import { saveDefaultPreferences } from '../../utils/storage';

export default function SetupStep2Sunscreen({ navigation }) {
    const [useSunscreen, setUseSunscreen] = useState(null);

    const handleContinue = async () => {
        if (useSunscreen === null) {
            Alert.alert('Selection Required', 'Please select your typical sunscreen usage.');
            return;
        }

        try {
            // Save default preference
            await saveDefaultPreferences({
                defaultSunscreen: useSunscreen,
                defaultCloudy: false
            });

            // Navigate to next step
            navigation.navigate('SetupStep3');
        } catch (error) {
            console.error('Error saving preferences:', error);
            Alert.alert('Error', 'Error saving your data. Please try again.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Progress Indicator */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '50%' }]} />
                    </View>
                    <Text style={styles.progressText}>Step 2 of 4</Text>
                </View>

                {/* Header */}
                <Animated.View
                    entering={FadeInDown}
                    style={styles.header}
                >
                    <Shield color={COLORS.primary} size={moderateScale(64)} style={{ marginBottom: SPACING.md }} />
                    <Text style={styles.title}>Sunscreen Usage</Text>
                    <Text style={styles.subtitle}>
                        Do you typically use sunscreen when going outside? This sets your default preference.
                    </Text>
                </Animated.View>

                {/* Options */}
                <View style={styles.optionsContainer}>
                    <Animated.View entering={FadeInDown}>
                        <TouchableOpacity
                            style={[
                                styles.optionCard,
                                useSunscreen === true && styles.optionCardSelected,
                            ]}
                            onPress={() => setUseSunscreen(true)}
                        >
                            <View style={styles.optionContent}>
                                <Check color={COLORS.primary} size={moderateScale(32)} style={{ marginRight: SPACING.md }} />
                                <View style={styles.optionText}>
                                    <Text style={styles.optionTitle}>Yes, I use sunscreen</Text>
                                    <Text style={styles.optionDescription}>
                                        Safe exposure times will be extended
                                    </Text>
                                </View>
                            </View>
                            {useSunscreen === true && (
                                <Text style={styles.checkmark}>✓</Text>
                            )}
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View entering={FadeInDown}>
                        <TouchableOpacity
                            style={[
                                styles.optionCard,
                                useSunscreen === false && styles.optionCardSelected,
                            ]}
                            onPress={() => setUseSunscreen(false)}
                        >
                            <View style={styles.optionContent}>
                                <Sun color={COLORS.primary} size={moderateScale(32)} style={{ marginRight: SPACING.md }} />
                                <View style={styles.optionText}>
                                    <Text style={styles.optionTitle}>No, I don't use sunscreen</Text>
                                    <Text style={styles.optionDescription}>
                                        Safe exposure times will be shorter
                                    </Text>
                                </View>
                            </View>
                            {useSunscreen === false && (
                                <Text style={styles.checkmark}>✓</Text>
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                </View>

                {/* Info Note */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoText}>
                        You can change this anytime in Settings or toggle it on the Home screen for specific sessions.
                    </Text>
                </View>

                {/* Continue Button */}
                <TouchableOpacity
                    style={[styles.continueButton, useSunscreen === null && styles.buttonDisabled]}
                    onPress={handleContinue}
                    disabled={useSunscreen === null}
                >
                    <Text style={styles.continueButtonText}>
                        Continue →
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
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
        backgroundColor: COLORS.backgroundLight,
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
    },
    progressText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
        textAlign: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    emoji: {
        fontSize: moderateScale(64),
        marginBottom: SPACING.md,
    },
    title: {
        ...TYPOGRAPHY.title,
        textAlign: 'center',
        marginBottom: SPACING.sm,
    },
    subtitle: {
        ...TYPOGRAPHY.body,
        textAlign: 'center',
        color: COLORS.textSecondary,
        paddingHorizontal: SPACING.md,
        lineHeight: moderateScale(24),
    },
    optionsContainer: {
        marginBottom: SPACING.lg,
    },
    optionCard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        borderWidth: 2,
        borderColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...SHADOWS.small,
    },
    optionCardSelected: {
        borderColor: COLORS.primary,
        borderWidth: 3,
        ...SHADOWS.medium,
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    optionEmoji: {
        fontSize: moderateScale(32),
        marginRight: SPACING.md,
    },
    optionText: {
        flex: 1,
    },
    optionTitle: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '600',
        marginBottom: SPACING.xs,
    },
    optionDescription: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
    },
    checkmark: {
        fontSize: moderateScale(28),
        color: COLORS.primary,
    },
    infoCard: {
        backgroundColor: COLORS.backgroundLight,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.xl,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
    },
    infoText: {
        ...TYPOGRAPHY.body,
        lineHeight: 22,
    },
    continueButton: {
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md + 2,
        alignItems: 'center',
        ...SHADOWS.button,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    continueButtonText: {
        ...TYPOGRAPHY.subheading,
        color: COLORS.white,
        fontWeight: '600',
    },
});
