// components/UserProfile.js
"use client"

import { useAuth } from "@/lib/AuthContext";
import { Button, Stack, Typography } from "@mui/material";

export default function UserProfile() {
    const { user, loading, signOutUser, signInWithGoogle } = useAuth();

    if (loading) return <div>Loading...</div>;

    return (
        <Stack spacing={2}>
            {
                user ? (
                    <>
                        {/* <img src={user.photoURL} alt="User Avatar" width={100} height={100} /> */}
                        <Typography variant="body1">Name: {user.displayName}</Typography>
                        <Typography variant="body1">Email: {user.email}</Typography>
                        <Button variant="contained" color="primary" onClick={signOutUser}>Sign Out</Button>
                    </>
                ) : (
                    <>
                        <div>Please sign in.</div>
                    </>
                )
            }
        </Stack>
    );
}
