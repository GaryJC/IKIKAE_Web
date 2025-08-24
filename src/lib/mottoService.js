import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    setDoc
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

// Link pre-generated QR code to user (when business operator scans and links)
export const linkQRCodeToUser = async (qrCodeId, userEmail) => {
    try {
        // Check if QR code is already linked
        const qrCodesRef = collection(db, 'qrCodes');
        const q = query(qrCodesRef, where('qrCodeId', '==', qrCodeId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const qrCodeDoc = querySnapshot.docs[0];
            const qrCodeData = qrCodeDoc.data();

            if (qrCodeData.isLinked) {
                return { success: false, error: 'QR code is already linked to a user' };
            }

            // Update existing QR code with user information
            await updateDoc(qrCodeDoc.ref, {
                isLinked: true,
                linkedUserEmail: userEmail,
                linkedAt: serverTimestamp()
            });
        } else {
            // Create new QR code entry if it doesn't exist
            const qrCodeData = {
                qrCodeId: qrCodeId,
                isLinked: true,
                linkedUserEmail: userEmail,
                linkedAt: serverTimestamp(),
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'qrCodes'), qrCodeData);
        }

        return { success: true, message: 'QR code linked successfully' };
    } catch (error) {
        console.error('Error linking QR code:', error);
        return { success: false, error: error.message };
    }
};

// Get user profile by QR code ID (for customers scanning)
export const getUserProfileByQRCode = async (qrCodeId) => {
    try {
        // Find the QR code
        const qrCodesRef = collection(db, 'qrCodes');
        const q = query(qrCodesRef, where('qrCodeId', '==', qrCodeId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, error: 'QR code not found' };
        }

        const qrCodeDoc = querySnapshot.docs[0];
        const qrCodeData = qrCodeDoc.data();

        if (!qrCodeData.isLinked) {
            return { success: false, error: 'QR code not linked to any user' };
        }

        // Get user profile
        const emailDocId = qrCodeData.linkedUserEmail.replace(/[.#$[\]]/g, '_');
        const userRef = doc(db, 'users', emailDocId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists() || !userDoc.data().motto) {
            return { success: false, error: 'User profile not found' };
        }

        const userData = userDoc.data();

        return {
            success: true,
            profile: {
                id: userData.mottoId,
                motto: userData.motto,
                userName: userData.name || 'Anonymous',
                userEmail: userData.email
            }
        };
    } catch (error) {
        console.error('Error getting profile by QR code:', error);
        return { success: false, error: error.message };
    }
};

// Get all QR codes (for admin management)
export const getAllQRCodes = async () => {
    try {
        const qrCodesRef = collection(db, 'qrCodes');
        const querySnapshot = await getDocs(qrCodesRef);

        const qrCodes = [];
        querySnapshot.forEach((doc) => {
            qrCodes.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return { success: true, qrCodes: qrCodes };
    } catch (error) {
        console.error('Error getting QR codes:', error);
        return { success: false, error: error.message };
    }
};

// Get QR code by ID
export const getQRCodeById = async (qrCodeId) => {
    try {
        const qrCodesRef = collection(db, 'qrCodes');
        const q = query(qrCodesRef, where('qrCodeId', '==', qrCodeId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, error: 'QR code not found' };
        }

        const qrCodeDoc = querySnapshot.docs[0];
        return { success: true, qrCode: { id: qrCodeDoc.id, ...qrCodeDoc.data() } };
    } catch (error) {
        console.error('Error getting QR code:', error);
        return { success: false, error: error.message };
    }
};

// Create a new QR code entry for production (when generating QR codes)
export const createQRCodeForProduction = async (qrCodeId) => {
    try {
        // Check if QR code already exists
        const qrCodesRef = collection(db, 'qrCodes');
        const q = query(qrCodesRef, where('qrCodeId', '==', qrCodeId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            return { success: false, error: 'QR code already exists' };
        }

        // Create new QR code entry
        const qrCodeData = {
            qrCodeId: qrCodeId,
            isLinked: false,
            linkedUserEmail: null,
            linkedAt: null,
            createdAt: serverTimestamp(),
            generatedBy: 'production' // Track that this was generated for production
        };

        await addDoc(collection(db, 'qrCodes'), qrCodeData);

        return { success: true, message: 'QR code created successfully' };
    } catch (error) {
        console.error('Error creating QR code for production:', error);
        return { success: false, error: error.message };
    }
};

