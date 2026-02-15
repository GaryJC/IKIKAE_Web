// components/UserProfile.js
"use client"

import { useAuth } from "@/lib/AuthContext";
import { Button, Stack, Typography, Paper, Box, CircularProgress } from "@mui/material";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { getUserMotto } from "@/lib/mottoService";
// import { useAdmin } from "@/lib/useAdmin"; // Temporarily disabled

export default function UserProfile() {
    const { user, loading, signOutUser } = useAuth();
    // const { isAdmin } = useAdmin(); // Temporarily disabled
    const isAdmin = true; // Temporarily allow all authenticated users
    const [hasExistingMotto, setHasExistingMotto] = useState(false);
    const [loadingMotto, setLoadingMotto] = useState(true);

    // Check if user has an existing motto
    useEffect(() => {
        const checkUserMotto = async () => {
            if (user) {
                setLoadingMotto(true);
                try {
                    const result = await getUserMotto(user);
                    if (result.success && result.motto) {
                        setHasExistingMotto(true);
                    } else {
                        setHasExistingMotto(false);
                    }
                } catch (error) {
                    console.error('Error checking motto:', error);
                    setHasExistingMotto(false);
                } finally {
                    setLoadingMotto(false);
                }
            } else {
                setLoadingMotto(false);
            }
        };

        checkUserMotto();
    }, [user]);

    if (loading || loadingMotto) return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
            <CircularProgress />
        </Box>
    );

    return (
        <Stack spacing={3} maxWidth="600px" margin="0 auto" padding={3}>
            <Typography variant="h4" textAlign="center" gutterBottom>
                User Profile
            </Typography>

            {user ? (
                <Paper elevation={3} sx={{ padding: 3 }}>
                    <Stack spacing={3} alignItems="center">
                        {user.photoURL && (
                            <Image
                                src={user.photoURL}
                                alt="User Avatar"
                                width={100}
                                height={100}
                                className="rounded-full"
                            />
                        )}

                        <Stack spacing={1} alignItems="center">
                            <Typography variant="h6">
                                {user.displayName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {user.email}
                            </Typography>
                        </Stack>

                        <Stack spacing={2} width="100%">
                            <Link href="/userProfile/motto">
                                <Button
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    size="large"
                                >
                                    {hasExistingMotto ? "View Your Motto" : "Create Your Motto"}
                                </Button>
                            </Link>

                            {/* Admin Panel Links - Only show for admin users */}
                            {isAdmin && (
                                <>
                                    <Link href="/admin/manage-users">
                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            fullWidth
                                        >
                                            Manage User Roles (Admin)
                                        </Button>
                                    </Link>
                                </>
                            )}

                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={signOutUser}
                                fullWidth
                            >
                                Sign Out
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>
            ) : (
                <Paper elevation={3} sx={{ padding: 3 }}>
                    <Stack spacing={2} alignItems="center">
                        <Typography variant="h6">Please sign in to view your profile</Typography>
                        <Link href="/">
                            <Button variant="contained">Go Home</Button>
                        </Link>
                    </Stack>
                </Paper>
            )}
        </Stack>
    );
}
