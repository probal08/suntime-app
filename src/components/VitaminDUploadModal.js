import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Platform
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS, moderateScale, COLORS } from '../constants/theme';
import StandardButton from './common/StandardButton';
import { X, Camera, Upload, Calendar } from 'lucide-react-native';
import { db, auth } from '../config/firebase'; // Direct db access for reports
import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { uploadReportImage } from '../services/storage';

export default function VitaminDUploadModal({ visible, onClose, onUploadSuccess }) {
    const { colors, isDark } = useTheme();
    const styles = getStyles(colors, isDark);

    const [level, setLevel] = useState('');
    const [loading, setLoading] = useState(false);
    const [lastUploadDate, setLastUploadDate] = useState(null);
    const [daysRemaining, setDaysRemaining] = useState(0);
    const [reportImage, setReportImage] = useState(null); // Local URI

    // Initial check for 30-day limit
    useEffect(() => {
        if (visible && auth.currentUser) {
            checkLastUpload();
        }
    }, [visible]);

    const checkLastUpload = async () => {
        try {
            setLoading(true);
            const reportsRef = collection(db, 'vitaminDReports');
            const q = query(
                reportsRef,
                where('userId', '==', auth.currentUser.uid),
                orderBy('date', 'desc'),
                limit(1)
            );
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const lastReport = snapshot.docs[0].data();
                const lastDate = new Date(lastReport.date);
                setLastUploadDate(lastDate);

                const now = new Date();
                const diffTime = Math.abs(now - lastDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 30) {
                    setDaysRemaining(30 - diffDays);
                } else {
                    setDaysRemaining(0);
                }
            } else {
                setDaysRemaining(0);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error checking reports:', error);
            setLoading(false);
        }
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.7,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                setReportImage(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'Could not pick image.');
        }
    };

    const handleUpload = async () => {
        // 1. Validation
        const val = parseFloat(level);
        if (isNaN(val) || val < 10 || val > 100) {
            Alert.alert('Invalid Value', 'Vitamin D level must be between 10 ng/mL and 100 ng/mL.');
            return;
        }

        if (daysRemaining > 0) {
            Alert.alert('Limit Reached', `You can upload a new report in ${daysRemaining} days.`);
            return;
        }

        try {
            setLoading(true);
            const uid = auth.currentUser.uid;

            // 2. Upload Image (if selected)
            let downloadURL = null;
            if (reportImage) {
                downloadURL = await uploadReportImage(uid, reportImage);
            }

            // 3. Determine Status
            // Re-use logic or import it (importing might cause circular deps if not careful, sticking to logic here for now or importing helper)
            // Importing getVitaminDStatus from sunLogic is safe.
            const { getVitaminDStatus } = require('../utils/sunLogic');
            const statusInfo = getVitaminDStatus(val);

            // 4. Save to Firestore
            await addDoc(collection(db, 'vitaminDReports'), {
                userId: uid,
                value: val,
                unit: 'ng/mL',
                date: new Date().toISOString(),
                imageUrl: downloadURL,
                status: statusInfo.status,
                adjustment: statusInfo.adjustment
            });

            setLoading(false);
            Alert.alert(
                'Report Saved',
                `Status: ${statusInfo.status}\n${statusInfo.message}`,
                [
                    {
                        text: 'OK', onPress: () => {
                            if (onUploadSuccess) onUploadSuccess();
                            onClose();
                            setLevel('');
                            setReportImage(null);
                        }
                    }
                ]
            );
        } catch (e) {
            console.error(e);
            setLoading(false);
            Alert.alert('Error', 'Failed to save report. Please try again.');
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Vitamin D Report</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={{ marginTop: 10, color: colors.textSecondary }}>Processing...</Text>
                        </View>
                    ) : daysRemaining > 0 ? (
                        <View style={styles.limitContainer}>
                            <Calendar size={48} color={colors.textSecondary} style={{ marginBottom: 16 }} />
                            <Text style={styles.limitTitle}>Monthly Limit Reached</Text>
                            <Text style={styles.limitText}>
                                Progress tracking is limited to once every 30 days to ensure meaningful data.
                            </Text>
                            <Text style={styles.limitHighlight}>
                                Next upload: {daysRemaining} days
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.form}>
                            {/* Medical Disclaimer */}
                            <View style={styles.disclaimerBox}>
                                <Text style={styles.disclaimerText}>
                                    ⚠️ Not medical advice. For awareness only.
                                    Accepts 25(OH)D reports only.
                                </Text>
                            </View>

                            <Text style={styles.label}>25(OH)D Level (ng/mL)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 18"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="numeric"
                                value={level}
                                onChangeText={setLevel}
                            />

                            <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                                {reportImage ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Camera size={20} color={colors.primary} />
                                        <Text style={[styles.uploadText, { color: colors.primary, marginLeft: 8 }]}>
                                            Image Selected
                                        </Text>
                                    </View>
                                ) : (
                                    <>
                                        <Upload size={24} color={colors.textSecondary} />
                                        <Text style={styles.uploadText}>Upload Report Image (Optional)</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <StandardButton
                                title="Analyze & Save"
                                onPress={handleUpload}
                                style={{ marginTop: SPACING.lg }}
                            />
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const getStyles = (colors, isDark) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: colors.cardBackground,
        borderTopLeftRadius: BORDER_RADIUS.xl,
        borderTopRightRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        minHeight: 500,
        ...SHADOWS.large,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    title: {
        ...TYPOGRAPHY.heading,
        color: colors.text,
        fontSize: moderateScale(20),
    },
    closeButton: {
        padding: SPACING.xs,
    },
    form: {
        gap: SPACING.md,
    },
    label: {
        ...TYPOGRAPHY.subheading,
        color: colors.text,
        fontWeight: '600',
        marginTop: SPACING.sm,
    },
    input: {
        backgroundColor: colors.background,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        fontSize: moderateScale(16),
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    },
    uploadBox: {
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background + '80', // slight transparency
        marginTop: SPACING.sm,
    },
    uploadText: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
        marginTop: SPACING.xs,
    },
    disclaimerBox: {
        backgroundColor: '#FFF3E0', // Light orange warning bg
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.sm,
    },
    disclaimerText: {
        color: '#E65100', // Darker orange text
        fontSize: moderateScale(12),
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
    },
    limitContainer: {
        alignItems: 'center',
        padding: SPACING.xl,
    },
    limitTitle: {
        ...TYPOGRAPHY.subheading,
        color: colors.text,
        fontWeight: 'bold',
        marginBottom: SPACING.md,
    },
    limitText: {
        ...TYPOGRAPHY.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.lg,
    },
    limitHighlight: {
        ...TYPOGRAPHY.body,
        color: colors.primary,
        fontWeight: 'bold',
    },
});
