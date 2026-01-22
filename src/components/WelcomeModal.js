import React from 'react';
import { View, Text, Modal, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS, moderateScale } from '../constants/theme';
import StandardButton from './common/StandardButton';
import { PartyPopper, CheckCircle2 } from 'lucide-react-native';

const FEATURES = [
    "✅ Scientific UV Exposure Scoring",
    "✅ Daily Safe Session Limits",
    "✅ Vitamin D Level Tracking",
    "✅ Personalized Skin Type Protection",
    "✅ Enhanced Progress & History",
    "✅ Dark Mode & Weather Integration"
];

export default function WelcomeModal({ visible, onClose }) {
    const { colors, isDark } = useTheme();

    // Memoize styles to avoid flicker
    const dynamicStyles = getStyles(colors, isDark);

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={dynamicStyles.overlay}>
                <View style={dynamicStyles.content}>
                    <View style={dynamicStyles.header}>
                        <View style={dynamicStyles.iconContainer}>
                            <PartyPopper size={32} color="#FFF" />
                        </View>
                        <Text style={dynamicStyles.title}>Welcome back!</Text>
                        <Text style={dynamicStyles.subtitle}>
                            Suntime just got better. Here's what's new:
                        </Text>
                    </View>

                    <ScrollView style={dynamicStyles.scroll} contentContainerStyle={dynamicStyles.scrollContent}>
                        {FEATURES.map((feature, index) => (
                            <View key={index} style={dynamicStyles.featureRow}>
                                <Text style={dynamicStyles.featureText}>{feature}</Text>
                            </View>
                        ))}
                    </ScrollView>

                    <View style={dynamicStyles.footer}>
                        <StandardButton
                            title="Got it!"
                            onPress={onClose}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const getStyles = (colors, isDark) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    content: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.xl,
        ...SHADOWS.large,
        overflow: 'hidden',
    },
    header: {
        alignItems: 'center',
        padding: SPACING.xl,
        backgroundColor: isDark ? colors.primary + '20' : colors.primary + '10',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
        ...SHADOWS.medium,
    },
    title: {
        ...TYPOGRAPHY.heading,
        color: colors.text,
        fontSize: moderateScale(22),
        marginBottom: SPACING.xs,
        textAlign: 'center',
    },
    subtitle: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    scroll: {
        maxHeight: 300,
    },
    scrollContent: {
        padding: SPACING.lg,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        backgroundColor: colors.background,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
    },
    featureText: {
        ...TYPOGRAPHY.body,
        color: colors.text,
        fontWeight: '500',
        fontSize: moderateScale(14),
    },
    footer: {
        padding: SPACING.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
});
