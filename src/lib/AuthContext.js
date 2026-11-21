"use client"

import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './firebase';
import {
    onAuthStateChanged,
    signInWithPopup,
    signInWithRedirect,
    GoogleAuthProvider,
    signOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Create Context
const AuthContext = createContext();

const createGoogleProvider = () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
        prompt: 'select_account',
    });
    return provider;
};

// Provider Component
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Listen for auth state changes
    useEffect(() => {
        let authEventId = 0;

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            const eventId = authEventId + 1;
            authEventId = eventId;
            setLoading(true);

            if (!currentUser) {
                if (eventId === authEventId) {
                    setUser(null);
                    setLoading(false);
                }
                return;
            }

            try {
                // Use email as document ID (replace dots and special chars for Firestore compatibility)
                const emailDocId = currentUser.email.replace(/[.#$[\]]/g, '_');

                // Check if user exists in Firestore
                const userRef = doc(db, 'users', emailDocId);
                const docSnap = await getDoc(userRef);

                if (!docSnap.exists()) {
                    // Create new user document
                    await setDoc(userRef, {
                        uid: currentUser.uid, // Store the original UID for reference
                        name: currentUser.displayName,
                        email: currentUser.email,
                        image: currentUser.photoURL,
                        createdAt: new Date(),
                        // Add more fields as needed
                    });
                }

                if (eventId === authEventId) {
                    setUser(currentUser);
                }
            } catch (error) {
                console.error('Error preparing user profile:', error);
                if (eventId === authEventId) {
                    setUser(currentUser);
                }
            } finally {
                if (eventId === authEventId) {
                    setLoading(false);
                }
            }
        });

        // Cleanup subscription on unmount
        return () => {
            authEventId += 1;
            unsubscribe();
        };
    }, []);

    // Sign in with Google
    const signInWithGoogle = async () => {
        const provider = createGoogleProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/cancelled-popup-request') {
                await signInWithRedirect(auth, provider);
                return;
            }

            console.error('Error signing in with Google:', error);
            throw error;
        }
    };

    // Sign out
    const signOutUser = async () => {
        try {
            await signOut(auth);
            // User is signed out
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOutUser }}>
            {children}
        </AuthContext.Provider>
    );
}

// Custom hook for using auth context
export function useAuth() {
    return useContext(AuthContext);
}
