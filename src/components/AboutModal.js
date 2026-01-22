import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { X, Shield, Sun, Activity, CloudRain, Smartphone, AlertCircle, Info } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS, moderateScale, COLORS } from '../constants/theme';
import StandardButton from './common/StandardButton';

const { width } = Dimensions.get('window');

export default function AboutModal({ visible, onClose }) {
    const { colors, isDark } = useTheme();
    const styles = getStyles(colors, isDark);

    const FeatureItem = ({ icon: Icon, label, desc }) => (
        <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
                <Icon size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.featureLabel}>{label}</Text>
                {desc && <Text style={styles.featureDesc}>{desc}</Text>}
            </View>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>About SUNTIME</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* App Description */}
                        <Text style={styles.description}>
                            SUNTIME helps users track safe sun exposure using UV Index, skin type, location, and exposure duration.
                        </Text>

                        {/* Key Features */}
                        <Text style={styles.sectionTitle}>Key Features</Text>
                        <View style={styles.sectionCard}>
                            <FeatureItem icon={Sun} label="UV Index Tracking" />
                            <FeatureItem icon={Shield} label="Skin Type Personalization" />
                            <FeatureItem icon={Activity} label="Exposure Timer" />
                            <FeatureItem icon={Smartphone} label="Firebase Sync" />
                            <FeatureItem icon={CloudRain} label="Weather + Location" />
                            <FeatureItem icon={Info} label="Exposure Score" />
                        </View>

                        {/* Scientific Validation */}
                        <Text style={styles.sectionTitle}>Scientific Validation</Text>
                        <View style={styles.sectionCard}>
                            <Text style={styles.sciencePoint}>• <Text style={styles.bold}>UV Index is a WHO Standard:</Text> Developed by the World Health Organization to measure UV radiation intensity.</Text>
                            <Text style={styles.sciencePoint}>• <Text style={styles.bold}>UV Exposure = Intensity × Time:</Text> UV Dose = UV Index × Exposure Time.</Text>
                            <Text style={styles.sciencePoint}>• <Text style={styles.bold}>Skin Type Affects UV Sensitivity:</Text> Fitzpatrick Skin Scale estimates burn risk.</Text>
                            <Text style={styles.sciencePoint}>• <Text style={styles.bold}>Protection Factors:</Text> Sunscreen and cloud cover reduce UV radiation.</Text>
                            <Text style={styles.sciencePoint}>• <Text style={styles.bold}>Note:</Text> WHO and EPA use UV Index + time + skin type for sun safety.</Text>
                        </View>

                        {/* Justification - EXACT TEXT REQUIRED */}
                        <Text style={styles.sectionTitle}>Methodology</Text>
                        <View style={[styles.sectionCard, { backgroundColor: colors.background }]}>
                            <Text style={styles.justificationText}>
                                The SUNTIME application estimates ultraviolet (UV) exposure using scientifically accepted parameters such as the UV Index, exposure duration, skin type classification, and environmental protection factors. The UV Index is a globally recognized standard developed by the World Health Organization to represent UV radiation intensity. UV exposure is commonly calculated using the relationship between radiation intensity and time. Additionally, dermatological research confirms that skin sensitivity varies across Fitzpatrick Skin Types, which influences safe exposure limits. By combining these validated factors, SUNTIME provides an evidence-based estimation of UV exposure for awareness and sun safety guidance. The application does not perform medical diagnosis but offers scientifically aligned preventive insights.
                            </Text>
                        </View>

                        {/* Disclaimer */}
                        <View style={styles.disclaimerContainer}>
                            <AlertCircle size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                            <Text style={styles.disclaimerText}>
                                “This is an estimation for awareness only, not medical advice.”
                            </Text>
                        </View>

                        <StandardButton 
                            title="Close" 
                            onPress={onClose} 
                            style={{ marginTop: SPACING.md }}
                        />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const getStyles = (colors, isDark) => StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: SPACING.md,
    },
    modalContent: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.xl,
        maxHeight: '90%',
        ...SHADOWS.large,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        ...TYPOGRAPHY.subheading,
        fontSize: moderateScale(20),
        fontWeight: '700',
        color: colors.text,
    },
    closeBtn: {
        padding: 4,
    },
    scrollContent: {
        padding: SPACING.lg,
    },
    description: {
        ...TYPOGRAPHY.body,
        color: colors.text,
        marginBottom: SPACING.lg,
        lineHeight: 22,
    },
    sectionTitle: {
        ...TYPOGRAPHY.subheading,
        fontWeight: '700',
        color: colors.text,
        marginBottom: SPACING.sm,
        fontSize: moderateScale(16),
        marginTop: SPACING.sm,
    },
    sectionCard: {
        backgroundColor: colors.backgroundLight,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.lg,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    featureIcon: {
        width: 30,
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    featureLabel: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        color: colors.text,
        fontSize: moderateScale(14),
    },
    featureDesc: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
    },
    sciencePoint: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
        marginBottom: SPACING.xs,
        lineHeight: 20,
        fontSize: moderateScale(13),
    },
    bold: {
        fontWeight: '700',
        color: colors.text,
    },
    justificationText: {
        ...TYPOGRAPHY.body,
        fontSize: moderateScale(13),
        lineHeight: 20,
        color: colors.text,
        textAlign: 'justify',
    },
    disclaimerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F5F5',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.lg,
    },
    disclaimerText: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        flex: 1,
        fontStyle: 'italic',
    },
});
