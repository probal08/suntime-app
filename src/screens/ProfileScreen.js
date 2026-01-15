import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    Platform,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS, moderateScale, GRADIENTS, GLASS } from '../constants/theme';
import { User, Mail, Shield, MapPin, LogOut, ChevronRight, History, MoreVertical, Camera, Sun, ArrowLeft } from 'lucide-react-native';
import { getUsername, updateUsername, logout } from '../utils/auth';
import { getDefaultPreferences, getProfileImage, setProfileImage, getUserSettings, getManualUV, setManualUV } from '../utils/storage';
import { Edit2 } from 'lucide-react-native';
import MenuDrawer from '../components/MenuDrawer';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({ navigation }) {
    const { colors, isDark } = useTheme();
    const styles = React.useMemo(() => getStyles(colors), [colors]);
    const [username, setUsername] = useState('User');
    const [email, setEmail] = useState('user@example.com');
    const [skinType, setSkinType] = useState(null);
    const [preferences, setPreferences] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [profileImage, setProfileImageState] = useState(null);

    // Manual UV State
    const [manualUV, setManualUVState] = useState(null);

    // Modals
    const [isUsernameModalVisible, setIsUsernameModalVisible] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [isEmailModalVisible, setIsEmailModalVisible] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [isUVModalVisible, setIsUVModalVisible] = useState(false);
    const [newUV, setNewUV] = useState('');

    // Use useFocusEffect to reload data whenever the screen comes into focus
    // This ensures updates from "ChangeSkinType" are reflected immediately

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        const user = await getUsername();
        const prefs = await getDefaultPreferences();
        const savedImage = await getProfileImage();
        const settings = await getUserSettings();
        const savedUV = await getManualUV();
        const savedEmail = await AsyncStorage.getItem('user_email'); // Simple storage for email

        if (user) setUsername(user);
        if (prefs) setPreferences(prefs);
        if (savedImage) setProfileImageState(savedImage);
        if (settings && settings.skinType) setSkinType(settings.skinType);
        if (savedUV) setManualUVState(savedUV);
        if (savedEmail) setEmail(savedEmail);
    };

    const pickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permissionResult.granted === false) {
                Alert.alert("Permission Required", "You need to grant camera roll permissions to change your profile picture.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });

            if (!result.canceled) {
                const uri = result.assets[0].uri;
                setProfileImageState(uri);
                await setProfileImage(uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert("Error", "Failed to update profile picture.");
        }
    };

    const handleUpdateUsername = async () => {
        if (!newUsername || newUsername.trim().length < 3) {
            Alert.alert('Invalid Username', 'Username must be at least 3 characters long.');
            return;
        }

        const success = await updateUsername(newUsername.trim());
        if (success) {
            setUsername(newUsername.trim());
            setIsUsernameModalVisible(false);
            setNewUsername('');
            Alert.alert('Success', 'Username updated successfully!');
        } else {
            Alert.alert('Error', 'Failed to update username.');
        }
    };

    const handleUpdateEmail = async () => {
        if (!newEmail || !newEmail.includes('@')) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }
        await AsyncStorage.setItem('user_email', newEmail);
        setEmail(newEmail);
        setIsEmailModalVisible(false);
        setNewEmail('');
    };

    const handleUpdateUV = async () => {
        if (!newUV) {
            // If empty, clear manual UV
            await setManualUV(null);
            setManualUVState(null);
            setIsUVModalVisible(false);
            return;
        }

        const uvValue = parseFloat(newUV);
        if (isNaN(uvValue) || uvValue < 0 || uvValue > 20) {
            Alert.alert('Invalid UV Index', 'Please enter a valid UV Index (0-20).');
            return;
        }

        await setManualUV(uvValue);
        setManualUVState(uvValue);
        setIsUVModalVisible(false);
        setNewUV('');
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Auth' }],
                        });
                    }
                }
            ]
        );
    };

    const SettingItem = ({ icon: Icon, label, value, onPress, showArrow = true }) => (
        <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={!onPress}>
            <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                    <Icon size={moderateScale(20)} color={colors.primary} />
                </View>
                <View>
                    <Text style={styles.settingLabel}>{label}</Text>
                    {value && <Text style={styles.settingValue}>{value}</Text>}
                </View>
            </View>
            {showArrow && <ChevronRight size={moderateScale(20)} color={colors.textSecondary} />}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <LinearGradient
                colors={isDark ? GRADIENTS.night : GRADIENTS.sunrise}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                opacity={0.3} // Subtle background tint
            />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Section */}
                <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => navigation.navigate('Home')}
                    >
                        <ArrowLeft size={moderateScale(24)} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => setIsMenuOpen(true)}
                    >
                        <MoreVertical size={moderateScale(24)} color={colors.text} />
                    </TouchableOpacity>
                </Animated.View>

                {/* Profile Card */}
                <Animated.View entering={ZoomIn.delay(200)} style={styles.profileCard}>
                    <TouchableOpacity onPress={pickImage}>
                        <LinearGradient
                            colors={GRADIENTS.primary}
                            style={styles.avatarGradientBorder}
                        >
                            <View style={styles.avatarContainer}>
                                {profileImage ? (
                                    <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                                ) : (
                                    <User size={moderateScale(40)} color={colors.white} />
                                )}
                            </View>
                        </LinearGradient>
                        <View style={styles.editIconContainer}>
                            <Camera size={moderateScale(12)} color={colors.primary} />
                        </View>
                    </TouchableOpacity>
                    <View style={styles.usernameContainer}>
                        <Text style={styles.username}>{username}</Text>
                        <TouchableOpacity
                            style={styles.editUsernameButton}
                            onPress={() => {
                                setNewUsername(username);
                                setIsUsernameModalVisible(true);
                            }}
                        >
                            <Edit2 size={moderateScale(16)} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.userRole}>Sun Safety Enthusiast</Text>
                </Animated.View>

                {/* Personal Information */}
                <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    <View style={styles.card}>
                        <SettingItem
                            icon={User}
                            label="Username"
                            value={username}
                            showArrow={false}
                        />
                        <View style={styles.divider} />
                        <SettingItem
                            icon={Mail}
                            label="Email"
                            value={email}
                            showArrow={true}
                            onPress={() => {
                                setNewEmail(email);
                                setIsEmailModalVisible(true);
                            }}
                        />

                    </View>
                </Animated.View>

                {/* Sun Prevention Profile */}
                <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
                    <Text style={styles.sectionTitle}>My Sun Profile</Text>
                    <View style={styles.card}>
                        <SettingItem
                            icon={Shield}
                            label="Skin Type"
                            // FIX: Use correctly fetched skinType state
                            value={`Type ${skinType || 'Not Set'}`}
                            onPress={() => navigation.navigate('ChangeSkinType')}
                        />
                        <View style={styles.divider} />
                        <SettingItem
                            icon={Sun}
                            label="UV Index"
                            value={manualUV ? `Fixed at ${manualUV}` : 'Auto (Location based)'}
                            onPress={() => {
                                setNewUV(manualUV ? manualUV.toString() : '');
                                setIsUVModalVisible(true);
                            }}
                        />
                    </View>
                </Animated.View>

                <View style={styles.footerSpacer} />
            </ScrollView>

            {/* Slide-out Menu Drawer */}
            <MenuDrawer
                isVisible={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                navigation={navigation}
                username={username}
                profileImage={profileImage}
                onLogout={handleLogout}
            />

            {/* Edit Username Modal */}
            <Modal
                visible={isUsernameModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsUsernameModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsUsernameModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Update Username</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your username"
                                    placeholderTextColor={colors.textSecondary}
                                    value={newUsername}
                                    onChangeText={setNewUsername}
                                    autoCapitalize="words"
                                />
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.cancelButton]}
                                        onPress={() => setIsUsernameModalVisible(false)}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.saveButton]}
                                        onPress={handleUpdateUsername}
                                    >
                                        <Text style={styles.saveButtonText}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Edit Email Modal */}
            <Modal
                visible={isEmailModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsEmailModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsEmailModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Update Email</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your email"
                                    placeholderTextColor={colors.textSecondary}
                                    value={newEmail}
                                    onChangeText={setNewEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.cancelButton]}
                                        onPress={() => setIsEmailModalVisible(false)}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.saveButton]}
                                        onPress={handleUpdateEmail}
                                    >
                                        <Text style={styles.saveButtonText}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Manual UV Modal */}
            <Modal
                visible={isUVModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsUVModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsUVModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Manual UV Index</Text>
                                <Text style={styles.modalSubtitle}>Enter a fixed UV index to override live data. Leave empty to use auto detection.</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="UV Index (0-20)"
                                    placeholderTextColor={colors.textSecondary}
                                    value={newUV}
                                    onChangeText={setNewUV}
                                    keyboardType="numeric"
                                    maxLength={4}
                                />

                                <TouchableOpacity
                                    style={styles.gpsButton}
                                    onPress={async () => {
                                        await setManualUV(null);
                                        setManualUVState(null);
                                        setIsUVModalVisible(false);
                                        setNewUV('');
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg }}>
                                        <MapPin size={moderateScale(16)} color={colors.primary} style={{ marginRight: 8 }} />
                                        <Text style={{ color: colors.primary, fontWeight: '600' }}>Use GPS Location (Auto)</Text>
                                    </View>
                                </TouchableOpacity>

                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.cancelButton]}
                                        onPress={() => setIsUVModalVisible(false)}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.saveButton]}
                                        onPress={handleUpdateUV}
                                    >
                                        <Text style={styles.saveButtonText}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        padding: SPACING.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    headerTitle: {
        ...TYPOGRAPHY.title,
        fontSize: moderateScale(28),
        color: colors.text,
    },

    menuButton: {
        padding: SPACING.sm,
    },
    profileCard: {
        alignItems: 'center',
        marginBottom: SPACING.xxl,
    },
    avatarGradientBorder: {
        width: moderateScale(128),
        height: moderateScale(128),
        borderRadius: BORDER_RADIUS.full,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
        ...SHADOWS.medium,
    },
    avatarContainer: {
        width: moderateScale(120),
        height: moderateScale(120),
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: colors.cardBackground,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    editIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.full,
        padding: 4,
        ...SHADOWS.small,
    },
    usernameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
        gap: SPACING.xs,
    },
    editUsernameButton: {
        padding: 4,
        backgroundColor: colors.backgroundLight,
        borderRadius: BORDER_RADIUS.full,
    },
    username: {
        ...TYPOGRAPHY.heading,
        fontSize: moderateScale(24),
        color: colors.text,
    },
    userRole: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        ...TYPOGRAPHY.subheading,
        color: colors.textSecondary,
        marginBottom: SPACING.sm,
        marginLeft: SPACING.xs,
    },
    card: {
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        ...SHADOWS.small,
        ...(colors.background === '#121212' ? GLASS.dark : GLASS.default), // Dynamic Glass
        borderWidth: 0,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.md,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: moderateScale(36),
        height: moderateScale(36),
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: colors.backgroundLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    settingLabel: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        color: colors.text,
    },
    settingValue: {
        ...TYPOGRAPHY.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: SPACING.xs,
    },
    footerSpacer: {
        height: moderateScale(100),
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: colors.cardBackground,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        ...SHADOWS.medium,
    },
    modalTitle: {
        ...TYPOGRAPHY.title,
        fontSize: moderateScale(22),
        marginBottom: SPACING.sm,
        textAlign: 'center',
        color: colors.text,
    },
    modalSubtitle: {
        ...TYPOGRAPHY.body,
        fontSize: moderateScale(14),
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.lg,
    },
    input: {
        backgroundColor: colors.background,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        color: colors.text,
        fontSize: moderateScale(16),
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: SPACING.md,
    },
    modalButton: {
        flex: 1,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: colors.backgroundLight,
        borderWidth: 1,
        borderColor: colors.border,
    },
    saveButton: {
        backgroundColor: colors.primary,
        ...SHADOWS.small,
    },
    cancelButtonText: {
        color: colors.textSecondary,
        fontWeight: '600',
        fontSize: moderateScale(16),
    },
    saveButtonText: {
        color: colors.white,
        fontWeight: '600',
        fontSize: moderateScale(16),
    },
});
