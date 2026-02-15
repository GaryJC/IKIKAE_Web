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
    setDoc,
    runTransaction
} from 'firebase/firestore';
import { db } from './firebase';

const MOTTO_ID_REGEX = /^[a-zA-Z0-9_-]{4,12}$/;

// Create a motto with a user-chosen ID (only one motto per user allowed)
export const addMotto = async ({ motto, mottoId, visibility }, user) => {
    try {
        // Use email as document ID (replace dots and special chars for Firestore compatibility)
        const emailDocId = user.email.replace(/[.#$[\]]/g, '_');
        const userRef = doc(db, 'users', emailDocId);

        // Check if user already has a motto
        const userDoc = await getDoc(userRef);
        if (userDoc.exists() && userDoc.data().mottoId) {
            return { success: false, error: 'You already have a motto. Each user can only create one motto.' };
        }

        if (!mottoId || !MOTTO_ID_REGEX.test(mottoId)) {
            return { success: false, error: 'Motto ID must be 4-12 characters (letters, numbers, _ or -).' };
        }

        if (!['public', 'private'].includes(visibility)) {
            return { success: false, error: 'Visibility must be public or private.' };
        }

        const mottoRef = doc(db, 'mottos', mottoId);
        const existingMotto = await getDoc(mottoRef);
        if (existingMotto.exists()) {
            return { success: false, error: 'This Motto ID is already taken. Please choose another.' };
        }

        await setDoc(mottoRef, {
            motto: motto.trim(),
            visibility,
            ownerUid: user.uid,
            ownerEmail: user.email,
            ownerName: user.displayName || 'Anonymous',
            createdAt: serverTimestamp(),
            likeCount: 0,
        });

        await updateDoc(userRef, {
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

        if (userDoc.exists() && userDoc.data().mottoId) {
            const data = userDoc.data();
            const mottoId = String(data.mottoId);
            const mottoRef = doc(db, 'mottos', mottoId);
            const mottoDoc = await getDoc(mottoRef);

            if (!mottoDoc.exists()) {
                return { success: true, motto: null };
            }

            const mottoData = mottoDoc.data();
            return {
                success: true,
                motto: {
                    id: mottoId,
                    motto: mottoData.motto,
                    visibility: mottoData.visibility,
                    createdAt: mottoData.createdAt,
                    likeCount: mottoData.likeCount || 0,
                    userName: mottoData.ownerName,
                    userEmail: mottoData.ownerEmail
                }
            };
        }

        return { success: true, motto: null };
    } catch (error) {
        console.error('Error getting motto:', error);
        return { success: false, error: error.message };
    }
};

export const getMottoById = async (mottoId, user) => {
    try {
        const mottoRef = doc(db, 'mottos', mottoId);
        const mottoDoc = await getDoc(mottoRef);

        if (!mottoDoc.exists()) {
            return { success: false, error: 'Motto not found' };
        }

        const mottoData = mottoDoc.data();
        const isOwner = user && user.uid === mottoData.ownerUid;

        if (mottoData.visibility === 'private' && !isOwner) {
            return { success: false, error: 'This motto is private' };
        }

        return {
            success: true,
            motto: {
                id: mottoId,
                motto: mottoData.motto,
                visibility: mottoData.visibility,
                createdAt: mottoData.createdAt,
                likeCount: mottoData.likeCount || 0,
                userName: mottoData.ownerName,
                userEmail: mottoData.ownerEmail,
                isOwner
            }
        };
    } catch (error) {
        console.error('Error getting motto by ID:', error);
        return { success: false, error: error.message };
    }
};

export const getMottoLikeStatus = async (mottoId, user) => {
    try {
        if (!user) {
            return { success: true, liked: false };
        }

        const likeRef = doc(db, 'mottos', mottoId, 'likes', user.uid);
        const likeDoc = await getDoc(likeRef);
        return { success: true, liked: likeDoc.exists() };
    } catch (error) {
        console.error('Error checking like status:', error);
        return { success: false, error: error.message };
    }
};

export const likeMotto = async (mottoId, user) => {
    try {
        if (!user) {
            return { success: false, error: 'You must be signed in to like a motto.' };
        }

        const mottoRef = doc(db, 'mottos', mottoId);
        const likeRef = doc(db, 'mottos', mottoId, 'likes', user.uid);

        const result = await runTransaction(db, async (transaction) => {
            const mottoDoc = await transaction.get(mottoRef);
            if (!mottoDoc.exists()) {
                throw new Error('Motto not found');
            }

            const mottoData = mottoDoc.data();
            if (mottoData.visibility === 'private' && user.uid !== mottoData.ownerUid) {
                throw new Error('This motto is private');
            }

            const likeDoc = await transaction.get(likeRef);
            if (likeDoc.exists()) {
                return { alreadyLiked: true, likeCount: mottoDoc.data().likeCount || 0 };
            }

            transaction.set(likeRef, {
                createdAt: serverTimestamp(),
                userEmail: user.email
            });

            const currentCount = mottoDoc.data().likeCount || 0;
            transaction.update(mottoRef, { likeCount: currentCount + 1 });

            return { alreadyLiked: false, likeCount: currentCount + 1 };
        });

        return { success: true, ...result };
    } catch (error) {
        console.error('Error liking motto:', error);
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
