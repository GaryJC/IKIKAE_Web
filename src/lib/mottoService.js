import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

// Add a motto to the user document (only one motto per user allowed)
export const addMotto = async (motto, user) => {
    try {
        // Use email as document ID (replace dots and special chars for Firestore compatibility)
        const emailDocId = user.email.replace(/[.#$[\]]/g, '_');
        const userRef = doc(db, 'users', emailDocId);

        // Check if user already has a motto
        const userDoc = await getDoc(userRef);
        if (userDoc.exists() && userDoc.data().motto) {
            return { success: false, error: 'You already have a motto. Each user can only create one motto.' };
        }

        // Generate a unique numeric ID (1-999)
        const generateNumericId = () => Math.floor(Math.random() * 999) + 1;
        const mottoId = generateNumericId();

        // Update user document with motto
        await updateDoc(userRef, {
            motto: motto.trim(),
            mottoId: mottoId,
            mottoCreatedAt: serverTimestamp(),
        });

        return { success: true, id: mottoId };
    } catch (error) {
        console.error('Error adding motto:', error);
        return { success: false, error: error.message };
    }
};

// Get user's motto
export const getUserMotto = async (user) => {
    try {
        const emailDocId = user.email.replace(/[.#$[\]]/g, '_');
        const userRef = doc(db, 'users', emailDocId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists() && userDoc.data().motto) {
            const data = userDoc.data();
            return {
                success: true,
                motto: {
                    id: data.mottoId,
                    motto: data.motto,
                    createdAt: data.mottoCreatedAt,
                    userName: data.name,
                    userEmail: data.email
                }
            };
        }

        return { success: true, motto: null };
    } catch (error) {
        console.error('Error getting motto:', error);
        return { success: false, error: error.message };
    }
};

