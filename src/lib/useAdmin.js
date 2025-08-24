import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getIdTokenResult } from 'firebase/auth';

export const useAdmin = () => {
    const { user } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (!user) {
                setIsAdmin(false);
                setLoading(false);
                return;
            }

            try {
                // Get the user's ID token result which includes custom claims
                const tokenResult = await getIdTokenResult(user);
                const role = tokenResult.claims.role;
                setIsAdmin(role === 'admin');
            } catch (error) {
                console.error('Error checking admin status:', error);
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        };

        checkAdminStatus();
    }, [user]);

    return { isAdmin, loading };
};
