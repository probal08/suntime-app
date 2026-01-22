import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase'; // Correctly imported from initialized config
import { updateUserProfilePic } from './firestore';

/**
 * Upload Profile Image to Firebase Storage
 * Returns the download URL on success
 * 
 * @param {string} uid - User ID
 * @param {string} imageUri - Local image URI from image picker
 * @returns {Promise<string|null>} Download URL or null on failure
 */
export const uploadProfileImage = async (uid, imageUri) => {
    try {
        if (!uid || !imageUri) {
            console.error('Missing uid or imageUri');
            return null;
        }

        // Create unique filename based on UID to prevent collision/confusion
        // Using a timestamp ensures we don't have caching issues if the URL stays the same
        const filename = `profile_${uid}_${Date.now()}.jpg`;
        const storageRef = ref(storage, `profilePictures/${uid}/${filename}`);



        // Fetch the image and convert to blob
        const response = await fetch(imageUri);
        const blob = await response.blob();

        // Upload to Firebase Storage
        const snapshot = await uploadBytes(storageRef, blob);


        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);


        // Save URL to Firestore user document
        const firestoreSuccess = await updateUserProfilePic(uid, downloadURL);

        if (!firestoreSuccess) {
            console.warn('Image uploaded but Firestore update failed');
            // We still return the URL because the upload itself was successful
        }

        return downloadURL;
    } catch (error) {
        console.error('Error uploading profile image:', error);
        return null;
    }
};
