/**
 * Firestore Service for SUNTIME
 * 
 * Handles user data and session storage in Firebase Firestore.
 * Supports multi-device login (Firebase Auth default behavior).
 * 
 * IMPORTANT: This is the PRIMARY Firestore service.
 * All user/session operations should go through this file.
 * 
 * Collections:
 * - users/{uid}: User profile data
 * - sessions/{id}: Sun exposure session logs
 * 
 * User Document Schema:
 * {
 *   uid: string,
 *   username: string,
 *   email: string,
 *   skinType: number (1-6),
 *   preferences: { sunscreen: boolean, cloudy: boolean, uvPreference: string },
 *   setupCompleted: boolean,
 *   profileImage: string (Firebase Storage URL),
 *   createdAt: string,
 *   updatedAt: string
 * }
 */

import {
    doc,
    setDoc,
    getDoc,
    collection,
    addDoc,
    query,
    where,
    orderBy,
    getDocs,
    limit,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Collection names
const USERS_COLLECTION = 'users';
const SESSIONS_COLLECTION = 'sessions';

// ==========================================
// USER DATA FUNCTIONS
// ==========================================

/**
 * Save or update user data in Firestore
 * Uses merge: true to only update provided fields
 * NEVER creates duplicate documents - always uses user.uid as document ID
 * 
 * @param {string} uid - Firebase Auth UID
 * @param {object} userData - User data to save
 * @returns {boolean} Success status
 */
export const saveUserToFirestore = async (uid, userData) => {
    try {
        if (!uid) {
            console.error('saveUserToFirestore: No UID provided');
            return false;
        }

        const userRef = doc(db, USERS_COLLECTION, uid);
        const existingDoc = await getDoc(userRef);

        const dataToSave = {
            ...userData,
            uid: uid,
            updatedAt: new Date().toISOString()
        };

        // Only set createdAt on first save
        if (!existingDoc.exists()) {
            dataToSave.createdAt = new Date().toISOString();
        }

        await setDoc(userRef, dataToSave, { merge: true });
        return true;
    } catch (error) {
        console.error('Error saving user to Firestore:', error);
        return false;
    }
};

/**
 * Create initial user profile (called on sign up)
 * Sets default values for new users
 * 
 * @param {string} uid - Firebase Auth UID
 * @param {object} profileData - Initial profile data
 * @returns {object} Result with success status
 */
export const createUserProfile = async (uid, profileData) => {
    try {
        if (!uid) {
            return { success: false, error: 'No UID provided' };
        }

        const userRef = doc(db, USERS_COLLECTION, uid);
        const existingDoc = await getDoc(userRef);

        // Don't overwrite existing profile
        if (existingDoc.exists()) {
            return { success: true, message: 'Profile already exists' };
        }

        const initialData = {
            uid: uid,
            username: profileData.displayName || profileData.email?.split('@')[0] || 'User',
            email: profileData.email || '',
            skinType: profileData.skinType || null,
            preferences: {
                sunscreen: false,
                cloudy: false,
                uvPreference: 'gps'
            },
            setupCompleted: false,
            profileImage: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await setDoc(userRef, initialData);
        return { success: true };
    } catch (error) {
        console.error('Error creating user profile:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Fetch user data from Firestore
 * 
 * @param {string} uid - Firebase Auth UID
 * @returns {object|null} User data or null
 */
export const fetchUserData = async (uid) => {
    try {
        if (!uid) return null;
        const userRef = doc(db, USERS_COLLECTION, uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error('Error fetching user from Firestore:', error);
        return null;
    }
};

/**
 * Get user profile (compatible with firebaseFirestore.js API)
 * 
 * @param {string} uid - Firebase Auth UID
 * @returns {object} Result with success and data
 */
export const getUserProfile = async (uid) => {
    try {
        const data = await fetchUserData(uid);
        if (data) {
            return { success: true, data };
        }
        return { success: true, data: null };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Update user profile fields
 * 
 * @param {string} uid - Firebase Auth UID
 * @param {object} updates - Fields to update
 * @returns {object} Result with success status
 */
export const updateUserProfile = async (uid, updates) => {
    try {
        const success = await saveUserToFirestore(uid, updates);
        return { success };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Update user's profile picture URL in Firestore
 * 
 * @param {string} uid - Firebase Auth UID
 * @param {string} profileImageUrl - Firebase Storage download URL
 * @returns {boolean} Success status
 */
export const updateUserProfilePic = async (uid, profileImageUrl) => {
    try {
        if (!uid || !profileImageUrl) return false;

        const userRef = doc(db, USERS_COLLECTION, uid);

        await setDoc(userRef, {
            profileImage: profileImageUrl,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        return true;
    } catch (error) {
        console.error('Error updating profile pic:', error);
        return false;
    }
};

/**
 * Mark setup as completed
 * Called after final setup step (Step 4 Disclaimer)
 * 
 * @param {string} uid - Firebase Auth UID
 * @returns {object} Result with success status
 */
export const markSetupCompleted = async (uid) => {
    try {
        if (!uid) return { success: false };

        const userRef = doc(db, USERS_COLLECTION, uid);
        await setDoc(userRef, {
            setupCompleted: true,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        return { success: true };
    } catch (error) {
        console.error('Error marking setup complete:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Reset setup (for testing or user request)
 * 
 * @param {string} uid - Firebase Auth UID
 * @returns {object} Result with success status
 */
export const resetSetup = async (uid) => {
    try {
        if (!uid) return { success: false };

        const userRef = doc(db, USERS_COLLECTION, uid);
        await setDoc(userRef, {
            setupCompleted: false,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        return { success: true };
    } catch (error) {
        console.error('Error resetting setup:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Save user preferences
 * 
 * @param {string} uid - Firebase Auth UID
 * @param {object} preferences - User preferences
 * @returns {object} Result with success status
 */
export const savePreferences = async (uid, preferences) => {
    return updateUserProfile(uid, { preferences });
};

/**
 * Save skin type
 * 
 * @param {string} uid - Firebase Auth UID
 * @param {number} skinType - Fitzpatrick skin type (1-6)
 * @returns {object} Result with success status
 */
export const saveSkinType = async (uid, skinType) => {
    return updateUserProfile(uid, { skinType });
};

// ==========================================
// SESSION DATA FUNCTIONS
// ==========================================

/**
 * Save a sun exposure session to Firestore
 * 
 * @param {string} uid - Firebase Auth UID
 * @param {object} sessionData - Session data
 * @returns {boolean} Success status
 */
export const saveSessionToFirestore = async (uid, sessionData) => {
    try {
        if (!uid) {
            console.error('saveSessionToFirestore: No UID provided');
            return false;
        }

        const sessionsRef = collection(db, SESSIONS_COLLECTION);

        await addDoc(sessionsRef, {
            userId: uid,
            createdAt: new Date().toISOString(),
            ...sessionData
        });

        return true;
    } catch (error) {
        console.error('Error saving session to Firestore:', error);
        return false;
    }
};

/**
 * Fetch user's sessions from Firestore
 * Ordered by date descending (most recent first)
 * 
 * @param {string} uid - Firebase Auth UID
 * @returns {array} Array of session objects
 */
export const fetchSessions = async (uid) => {
    try {
        if (!uid) return [];
        const sessionsRef = collection(db, SESSIONS_COLLECTION);

        // Primary query with ordering (requires composite index)
        const q = query(
            sessionsRef,
            where('userId', '==', uid),
            orderBy('date', 'desc'),
            limit(100)
        );

        const querySnapshot = await getDocs(q);
        const sessions = [];
        querySnapshot.forEach((doc) => {
            sessions.push({ id: doc.id, ...doc.data() });
        });

        return sessions;
    } catch (error) {
        // Fallback for missing index
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            console.warn('⚠️ Firestore index missing. Using fallback query.');
            try {
                const sessionsRef = collection(db, SESSIONS_COLLECTION);
                const fallbackQ = query(
                    sessionsRef,
                    where('userId', '==', uid),
                    limit(100)
                );
                const fallbackSnapshot = await getDocs(fallbackQ);
                const sessions = [];
                fallbackSnapshot.forEach((doc) => {
                    sessions.push({ id: doc.id, ...doc.data() });
                });
                // Sort client-side
                sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
                return sessions;
            } catch (fallbackError) {
                console.error('Firestore fallback query failed:', fallbackError);
                return [];
            }
        }
        console.error('Error fetching sessions:', error);
        return [];
    }
};

/**
 * Get session statistics for a user
 * 
 * @param {string} uid - Firebase Auth UID
 * @returns {object} Stats object with totalSessions, totalMinutes, streak, averagePerDay
 */
export const getSessionStats = async (uid) => {
    try {
        const sessions = await fetchSessions(uid);

        if (!sessions || sessions.length === 0) {
            return {
                totalSessions: 0,
                totalMinutes: 0,
                currentStreak: 0,
                averagePerDay: 0
            };
        }

        const totalSessions = sessions.length;
        const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || s.exposureTime || 0), 0);

        // Calculate streak
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let streak = 0;
        let checkDate = new Date(today);

        for (let i = 0; i < 30; i++) {
            const hasSession = sessions.some(s => {
                const sessionDate = new Date(s.date);
                sessionDate.setHours(0, 0, 0, 0);
                return sessionDate.getTime() === checkDate.getTime();
            });

            if (hasSession) {
                streak++;
            } else if (i > 0) {
                break;
            }
            checkDate.setDate(checkDate.getDate() - 1);
        }

        // Calculate average per day
        const uniqueDays = new Set();
        sessions.forEach(s => {
            const d = new Date(s.date);
            uniqueDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
        });
        const averagePerDay = uniqueDays.size > 0 ? Math.round(totalMinutes / uniqueDays.size) : 0;

        return {
            totalSessions,
            totalMinutes,
            currentStreak: streak,
            averagePerDay
        };
    } catch (error) {
        console.error('Error calculating session stats:', error);
        return {
            totalSessions: 0,
            totalMinutes: 0,
            currentStreak: 0,
            averagePerDay: 0
        };
    }
};

// Legacy compatibility - markSetupComplete (old name)
export const markSetupComplete = markSetupCompleted;
