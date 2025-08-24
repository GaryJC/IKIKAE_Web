"use client"

import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './firebase';
import {
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Create Context
const AuthContext = createContext();

// Provider Component
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
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

                setUser(currentUser);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    // Sign in with Google
    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            // User is signed in
        } catch (error) {
            console.error('Error signing in with Google:', error);
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
