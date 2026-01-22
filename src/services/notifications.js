import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Safe notification scheduling utility for Expo SDK 53+
 * SERVICES Layer - Standardized
 */

/**
 * Schedule an immediate notification
 */
export const scheduleImmediateNotification = async (title, body, options = {}) => {
    try {
        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: options.sound !== false,
                ...options,
            },
            trigger: null, // Immediate
        });
        return id;
    } catch (error) {
        console.log('Immediate notification error:', error?.message || error);
        return null;
    }
};

/**
 * Schedule a notification for a specific date/time
 */
export const scheduleNotificationAtDate = async (title, body, date, options = {}) => {
    try {
        // Calculate seconds from now
        const seconds = Math.max(1, Math.floor((date.getTime() - Date.now()) / 1000));

        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: options.sound !== false,
                ...options,
            },
            trigger: {
                type: 'timeInterval',
                seconds: seconds,
                repeats: false,
            },
        });
        return id;
    } catch (error) {
        console.log('Date notification error:', error?.message || error);
        return null;
    }
};

/**
 * Schedule a daily notification at a specific time
 */
export const scheduleDailyNotification = async (title, body, hour, minute, options = {}) => {
    try {
        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: options.sound !== false,
                ...options,
            },
            trigger: {
                type: 'daily',
                hour: hour,
                minute: minute,
            },
        });
        return id;
    } catch (error) {
        console.log('Daily notification error:', error?.message || error);
        return null;
    }
};

/**
 * Cancel a scheduled notification
 */
export const cancelNotification = async (notificationId) => {
    try {
        if (notificationId) {
            await Notifications.cancelScheduledNotificationAsync(notificationId);
        }
    } catch (error) {
        console.log('Cancel notification error:', error?.message || error);
    }
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async () => {
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
        console.log('Cancel all notifications error:', error?.message || error);
    }
};

/**
 * Get all scheduled notifications
 */
export const getScheduledNotifications = async () => {
    try {
        return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
        console.log('Get notifications error:', error?.message || error);
        return [];
    }
};

/**
 * Format seconds to MM:SS string
 */
export const formatTimeRemaining = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Schedule a timer notification with accurate remaining time
 * Replaces any existing timer notification
 */
export const scheduleTimerNotification = async (endTimestamp, existingNotificationId = null) => {
    try {
        // Cancel existing notification if any
        if (existingNotificationId) {
            await cancelNotification(existingNotificationId);
        }

        const now = Date.now();
        const remainingMs = endTimestamp - now;

        if (remainingMs <= 0) {
            // Timer already expired
            return null;
        }

        const remainingSeconds = Math.ceil(remainingMs / 1000);
        const endTime = new Date(endTimestamp);
        const timeString = endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

        // Schedule the completion notification
        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: '⏰ Sun Exposure Complete!',
                body: 'Your safe sun time is up. Consider seeking shade.',
                sound: true,
                priority: 'high',
            },
            trigger: {
                type: 'timeInterval',
                seconds: remainingSeconds,
                repeats: false,
            },
        });


        return id;
    } catch (error) {
        console.log('Timer notification error:', error?.message || error);
        return null;
    }
};

/**
 * Schedule safe sun exposure reminder
 * Only schedules if within sun hours (10 AM - 4 PM) or upcoming
 */
export const scheduleSunExposureReminder = async (uvIndex) => {
    try {
        // Don't schedule if UV is 0 (night/dark)
        if (uvIndex === 0) return null;

        const now = new Date();
        const hour = now.getHours();

        // Only schedule if it's morning/midday (e.g., before 3 PM)
        if (hour >= 15) return null;

        // Check if we already have one
        const scheduled = await getScheduledNotifications();
        const existingId = scheduled.find(n => n.content?.title?.includes('Safe Sun'))?.identifier;
        if (existingId) return existingId;

        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Safe Sun Time ☀️',
                body: 'It\'s a good time to get safe sun exposure. Check UV levels now!',
                sound: true,
            },
            trigger: {
                type: 'daily',
                hour: 11,
                minute: 0,
            },
        });
        return id;
    } catch (error) {
        console.log('Sun reminder error:', error?.message || error);
        return null;
    }
};

/**
 * Schedule inactivity reminder (24 hours from now)
 */
export const scheduleInactivityReminder = async () => {
    try {
        const scheduled = await getScheduledNotifications();
        const inactivityId = scheduled.find(n => n.content?.title?.includes('miss you'))?.identifier;
        if (inactivityId) {
            await cancelNotification(inactivityId);
        }

        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: 'We miss you! ☀️',
                body: 'You haven\'t tracked your sun exposure today. Stay safe!',
                sound: true,
            },
            trigger: {
                type: 'timeInterval',
                seconds: 24 * 60 * 60, // 24 hours
                repeats: false,
            },
        });

        return id;
    } catch (error) {
        console.log('Inactivity reminder error:', error?.message || error);
        return null;
    }
};
