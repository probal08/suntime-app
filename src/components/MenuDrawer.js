import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Image,
    Dimensions,
    TouchableWithoutFeedback,
    ScrollView,
    Switch,
    Linking,
    Share,
    Alert
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    runOnJS,
    SlideInLeft,
    SlideOutLeft,
    Easing
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    X,
    Activity,
    BarChart2,
    Calendar,
    HelpCircle,
    User,
    LogOut,
    Moon,
    Settings,
    History,
    Shield,
    Share2,
    MessageSquare,
    Info,
    Lock
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, BORDER_RADIUS, moderateScale, GLASS } from '../constants/theme';

const { width, height } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.85; // 85% of screen width

// Gradient colors for the drawer background
const DRAWER_GRADIENT_LIGHT = ['#FFFFFF', '#F8F9FA', '#F0F2F5'];
const DRAWER_GRADIENT_DARK = ['#1A1A1A', '#121212', '#000000'];

const MenuItem = ({ icon: Icon, label, onPress, active, isDark, styles, colors }) => (
    <TouchableOpacity
        style={[
            styles.menuItem,
            active && (isDark ? styles.menuItemActiveDark : styles.menuItemActiveLight)
        ]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.iconContainer, active && styles.iconContainerActive]}>
            <Icon
                size={moderateScale(22)}
                color={active ? '#FFFFFF' : (isDark ? colors.text : colors.textSecondary)}
                style={styles.menuIcon}
            />
        </View>
        <Text style={[
            styles.menuLabel,
            { color: active ? (isDark ? '#FFFFFF' : colors.primary) : colors.text },
            active && styles.menuLabelActive
        ]}>
            {label}
        </Text>
        {active && <View style={styles.activeIndicator} />}
    </TouchableOpacity>
);

const SectionHeader = ({ title, color, styles }) => (
    <Text style={[styles.sectionHeader, { color: color }]}>{title}</Text>
);

export default function MenuDrawer({
    isVisible,
    onClose,
    navigation,
    username,
    profileImage,
    onLogout
}) {
    const { colors, isDark, toggleTheme } = useTheme();
    const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);

    const opacity = useSharedValue(0);
    const translateX = useSharedValue(-DRAWER_WIDTH);

    useEffect(() => {
        if (isVisible) {
            opacity.value = withTiming(1, { duration: 300 });
            translateX.value = withTiming(0, { duration: 300, easing: Easing.linear });
        } else {
            opacity.value = withTiming(0, { duration: 200 });
            translateX.value = withTiming(-DRAWER_WIDTH, { duration: 300 });
        }
    }, [isVisible]);

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const drawerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    if (!isVisible) return null;

    return (
        <Modal
            transparent
            visible={isVisible}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <Animated.View style={[styles.backdrop, backdropStyle]} />
                </TouchableWithoutFeedback>

                <Animated.View style={[styles.drawer, drawerStyle]}>
                    <LinearGradient
                        colors={isDark ? DRAWER_GRADIENT_DARK : DRAWER_GRADIENT_LIGHT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradientContainer}
                    >
                        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

                            {/* HEADER */}
                            <View style={styles.header}>
                                <View style={styles.brandContainer}>
                                    <LinearGradient
                                        colors={['#FF9800', '#F57C00']}
                                        style={styles.logoCircle}
                                    >
                                        <Shield size={moderateScale(18)} color="#FFF" fill="#FFF" />
                                    </LinearGradient>
                                    <View>
                                        <Text style={styles.appName}>Suntime</Text>
                                        <Text style={styles.tagline}>Health Is Wealth</Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                    <X size={moderateScale(24)} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.scrollContent}
                            >
                                <SectionHeader title="MENU" color={colors.textSecondary} styles={styles} />

                                <MenuItem
                                    icon={History}
                                    label="Activities"
                                    isDark={isDark}
                                    styles={styles}
                                    colors={colors}
                                    onPress={() => { onClose(); navigation.navigate('History'); }}
                                />
                                <MenuItem
                                    icon={Share2}
                                    label="Share App"
                                    isDark={isDark}
                                    styles={styles}
                                    colors={colors}
                                    onPress={async () => {
                                        try {
                                            await Share.share({
                                                message: 'Check out Suntime - Your personal sun safety companion! Download now: https://suntime.app',
                                            });
                                        } catch (error) {
                                            console.log('Share error:', error);
                                            Alert.alert('Error', 'Unable to share capability.');
                                        }
                                    }}
                                />

                                <View style={styles.spacer} />
                                <SectionHeader title="ACCOUNT" color={colors.textSecondary} styles={styles} />

                                <MenuItem
                                    icon={Settings}
                                    label="Settings"
                                    isDark={isDark}
                                    styles={styles}
                                    colors={colors}
                                    onPress={() => { onClose(); navigation.navigate('Settings'); }}
                                />
                                <MenuItem
                                    icon={MessageSquare}
                                    label="Send Feedback"
                                    isDark={isDark}
                                    styles={styles}
                                    colors={colors}
                                    onPress={async () => {
                                        onClose();
                                        const url = 'mailto:feedback@suntime.app?subject=Suntime App Feedback';
                                        try {
                                            const supported = await Linking.canOpenURL(url);
                                            if (supported) {
                                                await Linking.openURL(url);
                                            } else {
                                                Alert.alert('Error', 'No email app found to send feedback.');
                                            }
                                        } catch (err) {
                                            console.error('Feedback error:', err);
                                            Alert.alert('Error', 'Could not open email client.');
                                        }
                                    }}
                                />
                                <MenuItem
                                    icon={Lock}
                                    label="Privacy Policy"
                                    isDark={isDark}
                                    styles={styles}
                                    colors={colors}
                                    onPress={async () => {
                                        onClose();
                                        const url = 'https://www.google.com';
                                        try {
                                            const supported = await Linking.canOpenURL(url);
                                            if (supported) {
                                                await Linking.openURL(url);
                                            } else {
                                                Alert.alert('Error', 'Cannot open browser.');
                                            }
                                        } catch (err) {
                                            console.error('Privacy Policy error:', err);
                                        }
                                    }}
                                />
                                <MenuItem
                                    icon={Info}
                                    label="About"
                                    isDark={isDark}
                                    styles={styles}
                                    colors={colors}
                                    onPress={() => {
                                        Alert.alert(
                                            'Suntime',
                                            'Version 1.0.0\n\nDeveloped for Hackathon 2026.\nHelping you stay safe in the sun.',
                                            [{ text: 'OK' }]
                                        );
                                    }}
                                />
                                <MenuItem
                                    icon={LogOut}
                                    label="Log Out"
                                    isDark={isDark}
                                    styles={styles}
                                    colors={colors}
                                    onPress={onLogout}
                                />
                            </ScrollView>

                            {/* FOOTER */}
                            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                                <View style={styles.darkModeRow}>
                                    <View style={styles.darkModeLabel}>
                                        <View style={[styles.iconContainer, { backgroundColor: isDark ? '#333' : '#EEE' }]}>
                                            <Moon size={moderateScale(18)} color={colors.text} />
                                        </View>
                                        <Text style={styles.darkModeText}>Dark Mode</Text>
                                    </View>
                                    <Switch
                                        value={isDark}
                                        onValueChange={toggleTheme}
                                        trackColor={{ false: '#E0E0E0', true: colors.primary }}
                                        thumbColor={'#FFF'}
                                    />
                                </View>
                            </View>
                        </SafeAreaView>
                    </LinearGradient>
                </Animated.View>
            </View>
        </Modal>
    );
}

const getStyles = (colors, isDark) => StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-start',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    drawer: {
        width: DRAWER_WIDTH,
        height: '100%',
        ...SHADOWS.large,
        elevation: 20,
    },
    gradientContainer: {
        flex: 1,
        borderTopRightRadius: BORDER_RADIUS.xl,
        borderBottomRightRadius: BORDER_RADIUS.xl,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.xl,
        marginBottom: SPACING.xs,
    },
    brandContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    logoCircle: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#F57C00',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    appName: {
        fontSize: moderateScale(20),
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 0.5,
    },
    tagline: {
        fontSize: moderateScale(11),
        color: colors.textSecondary,
        fontWeight: '500',
    },
    closeBtn: {
        padding: 8,
        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        borderRadius: BORDER_RADIUS.full,
    },
    scrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.xl,
    },
    sectionHeader: {
        fontSize: moderateScale(11),
        fontWeight: '800',
        marginBottom: SPACING.md,
        letterSpacing: 1.5,
        marginTop: SPACING.md,
        opacity: 0.7,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.xs,
    },
    menuItemActiveLight: {
        backgroundColor: '#FFF3E0', // Light Orange tint
    },
    menuItemActiveDark: {
        backgroundColor: 'rgba(255, 152, 0, 0.15)', // Dark Orange tint
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    },
    iconContainerActive: {
        backgroundColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    menuIcon: {
        // styled inline
    },
    menuLabel: {
        fontSize: moderateScale(16),
        fontWeight: '600',
        flex: 1,
    },
    menuLabelActive: {
        fontWeight: '700',
    },
    activeIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
    },
    spacer: {
        height: SPACING.lg,
    },
    footer: {
        padding: SPACING.lg,
        borderTopWidth: 1,
        marginBottom: SPACING.md,
    },
    darkModeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
    },
    darkModeLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    darkModeText: {
        fontSize: moderateScale(15),
        color: colors.text,
        fontWeight: '600',
    },
});
