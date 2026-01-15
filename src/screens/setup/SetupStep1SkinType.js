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
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale, GLASS } from '../../constants/theme';
import { User } from 'lucide-react-native';
import { setOnboarded } from '../../utils/storage';
import { getSkinTypeDescription } from '../../utils/sunLogic';
import { useTheme } from '../../context/ThemeContext';

const SKIN_TYPES = [1, 2, 3, 4, 5, 6];

const SKIN_TYPE_COLORS = {
    1: '#FFE4E1',
    2: '#FFD7BE',
    3: '#F4C2A0',
    4: '#D2996B',
    5: '#A67C52',
    6: '#5D4037',
};

export default function SetupStep1SkinType({ navigation }) {
    const { colors, isDark } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);
    const [selectedType, setSelectedType] = useState(null);

    const handleContinue = async () => {
        if (selectedType === null) {
            Alert.alert('Selection Required', 'Please select your skin type to continue.');
            return;
        }

        try {
            // Save skin type (reusing existing onboarding logic)
            await setOnboarded(selectedType);

            // Navigate to next setup step
            navigation.navigate('SetupStep2');
        } catch (error) {
            console.error('Error saving skin type:', error);
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
                        <View style={[styles.progressFill, { width: '25%' }]} />
                    </View>
                    <Text style={styles.progressText}>Step 1 of 4</Text>
                </View>

                {/* Header */}
                <Animated.View
                    entering={FadeInDown}
                    style={styles.header}
                >
                    <User color={colors.primary} size={moderateScale(64)} style={{ marginBottom: SPACING.md }} />
                    <Text style={styles.title}>Select Your Skin Type</Text>
                    <Text style={styles.subtitle}>
                        Based on the Fitzpatrick Scale. This helps us calculate safe sun exposure times.
                    </Text>
                </Animated.View>

                {/* Skin Types */}
                <View style={styles.typesContainer}>
                    {SKIN_TYPES.map((type, index) => (
                        <Animated.View
                            entering={FadeInDown}
                            key={type}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.typeCard,
                                    selectedType === type && styles.typeCardSelected,
                                ]}
                                onPress={() => setSelectedType(type)}
                            >
                                <View style={styles.typeHeader}>
                                    <View
                                        style={[
                                            styles.typeIndicator,
                                            { backgroundColor: SKIN_TYPE_COLORS[type] }
                                        ]}
                                    />
                                    <Text style={styles.typeTitle}>
                                        {getSkinTypeDescription(type)}
                                    </Text>
                                    {selectedType === type && (
                                        <Text style={styles.checkmark}>✓</Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </View>

                {/* Continue Button */}
                <TouchableOpacity
                    style={[styles.continueButton, !selectedType && styles.buttonDisabled]}
                    onPress={handleContinue}
                    disabled={!selectedType}
                >
                    <Text style={styles.continueButtonText}>
                        Continue
                    </Text>
                </TouchableOpacity>
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
    emoji: {
        fontSize: moderateScale(64),
        marginBottom: SPACING.md,
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
        lineHeight: moderateScale(24),
    },
    typesContainer: {
        marginBottom: SPACING.xl,
    },
    typeCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        borderWidth: 2,
        borderColor: colors.border,
        ...SHADOWS.small,
        ...(isDark ? GLASS.dark : GLASS.default),
    },
    typeCardSelected: {
        borderColor: colors.primary,
        borderWidth: 3,
        ...SHADOWS.medium,
    },
    typeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    typeIndicator: {
        width: moderateScale(28),
        height: moderateScale(28),
        borderRadius: BORDER_RADIUS.full,
        marginRight: SPACING.md,
        borderWidth: 2,
        borderColor: colors.border,
    },
    typeTitle: {
        ...TYPOGRAPHY.subheading,
        flex: 1,
        fontWeight: '600',
        color: colors.text,
    },
    checkmark: {
        fontSize: moderateScale(28),
        color: colors.primary,
    },
    continueButton: {
        backgroundColor: colors.primary,
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
        color: colors.white,
        fontWeight: '600',
    },
});
