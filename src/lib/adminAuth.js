// This file should be used on the server-side only (API routes)
// You'll need to install firebase-admin: npm install firebase-admin

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
const apps = getApps();

if (!apps.length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const adminAuth = getAuth();

// Set admin role for a user
export const setUserRole = async (uid, role) => {
    try {
        await adminAuth.setCustomUserClaims(uid, { role });
        return { success: true, message: `User role set to ${role}` };
    } catch (error) {
        console.error('Error setting user role:', error);
        return { success: false, error: error.message };
    }
};

// Get user role
export const getUserRole = async (uid) => {
    try {
        const userRecord = await adminAuth.getUser(uid);
        return userRecord.customClaims?.role || 'user';
    } catch (error) {
        console.error('Error getting user role:', error);
        return 'user';
    }
};

// Check if user is admin
export const isUserAdmin = async (uid) => {
    const role = await getUserRole(uid);
    return role === 'admin';
};
