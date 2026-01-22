import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale, GLASS } from '../../constants/theme';
import { Activity, HelpCircle } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { savePreferences } from '../../services/firestore';
import { getVitaminDStatus } from '../../utils/sunLogic';
import StandardButton from '../../components/common/StandardButton';

export default function SetupStepVitaminD({ navigation }) {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    const [level, setLevel] = useState('');
    const [statusMessage, setStatusMessage] = useState(null);

    const handleLevelChange = (text) => {
        setLevel(text);

        const val = parseFloat(text);
        if (!isNaN(val) && val > 0) {
            const status = getVitaminDStatus(val);
            setStatusMessage(status);
        } else {
            setStatusMessage(null);
        }
    };

    const handleContinue = async () => {
        const val = parseFloat(level);

        // Optional step - can skip if empty
        if (level.trim() !== '' && (isNaN(val) || val < 0 || val > 150)) {
            Alert.alert('Invalid Input', 'Please enter a valid numeric level (0-150 ng/mL) or leave blank.');
            return;
        }

        try {
            if (user && !isNaN(val)) {
                // Save initial Vitamin D report
                // We'll mimic the structure used in ProgressScreen/VitaminDUploadModal
                // Note: Ideally we should use a consistent service method, but for now we'll save simple preference
                // Actually, let's save to preferences to keep setup simple, 
                // or rely on user doing a proper report later.
                // For now, let's just save it as a "baseline" in user profile/preferences.

                await savePreferences(user.uid, {
                    baselineVitaminD: val
                });
            }
        } catch (error) {
            console.error('Error saving Vitamin D preference:', error);
            // Don't block flow on error
        }

        navigation.navigate('SetupStep4');
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Progress Indicator */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: '85%' }]} />
                        </View>
                        <Text style={styles.progressText}>Step 3.5 of 4</Text>
                    </View>

                    {/* Header */}
                    <Animated.View entering={FadeInDown} style={styles.header}>
                        <Activity color={colors.primary} size={moderateScale(64)} style={{ marginBottom: SPACING.md }} />
                        <Text style={styles.title}>Vitamin D Baseline</Text>
                        <Text style={styles.subtitle}>
                            (Optional) Do you know your current levels?
                        </Text>
                    </Animated.View>

                    {/* Content */}
                    <Animated.View entering={FadeInDown.delay(100)} style={styles.formContainer}>
                        <View style={styles.infoCard}>
                            <Text style={styles.infoTitle}>Why we ask?</Text>
                            <Text style={styles.infoText}>
                                If your levels are low, we can slightly increase safe exposure times to help you generate more natural Vitamin D.
                            </Text>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Serum 25(OH)D (ng/mL)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 20"
                                placeholderTextColor={colors.textSecondary}
                                value={level}
                                onChangeText={handleLevelChange}
                                keyboardType="numeric"
                                maxLength={3}
                            />
                            <Text style={styles.inputHint}>
                                Leave blank if you don't know
                            </Text>
                        </View>

                        {statusMessage && (
                            <View style={[styles.statusCard,
                            statusMessage.status === 'Sufficient' ? styles.statusSuccess :
                                statusMessage.status === 'High' ? styles.statusWarning : styles.statusAlert
                            ]}>
                                <Text style={styles.statusTitle}>
                                    Status: {statusMessage.status}
                                </Text>
                                <Text style={styles.statusText}>
                                    {statusMessage.message}
                                </Text>
                            </View>
                        )}
                    </Animated.View>

                    <StandardButton
                        title="Continue"
                        onPress={handleContinue}
                        style={{ marginTop: SPACING.xl }}
                    />

                    <TouchableOpacity onPress={handleContinue} style={styles.skipButton}>
                        <Text style={styles.skipText}>Skip / I don't know</Text>
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
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
    formContainer: {
        gap: SPACING.lg,
    },
    infoCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        ...SHADOWS.small,
    },
    infoTitle: {
        ...TYPOGRAPHY.subheading,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: SPACING.sm,
    },
    infoText: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
        lineHeight: 22,
    },
    inputContainer: {
        marginTop: SPACING.md,
    },
    inputLabel: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '600',
        color: colors.text,
        marginBottom: SPACING.sm,
    },
    input: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        fontSize: moderateScale(20),
        color: colors.text,
        borderWidth: 2,
        borderColor: colors.border,
        textAlign: 'center',
    },
    inputHint: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        marginTop: SPACING.xs,
        textAlign: 'center',
    },
    statusCard: {
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        borderLeftWidth: 4,
    },
    statusSuccess: {
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        borderLeftColor: '#4CAF50',
    },
    statusWarning: {
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        borderLeftColor: '#FF9800',
    },
    statusAlert: {
        backgroundColor: 'rgba(33, 150, 243, 0.1)', // Default blue for calc message
        borderLeftColor: '#2196F3',
    },
    statusTitle: {
        ...TYPOGRAPHY.subheading,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    statusText: {
        ...TYPOGRAPHY.body,
        color: colors.text,
    },
    skipButton: {
        alignItems: 'center',
        padding: SPACING.md,
        marginTop: SPACING.sm,
    },
    skipText: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
    }
});
