"use client"

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button, Stack, Typography, Paper, Box, CircularProgress, Alert } from "@mui/material";
import Link from "next/link";
import { getUserProfileByQRCode } from "@/lib/mottoService";

export default function QRProfilePage() {
    const params = useParams();
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (params.qrCodeId) {
            fetchProfile(params.qrCodeId);
        }
    }, [params.qrCodeId]);

    const fetchProfile = async (qrCodeId) => {
        setLoading(true);
        setError('');

        try {
            const result = await getUserProfileByQRCode(qrCodeId);
            if (result.success && result.profile) {
                setUserProfile(result.profile);
            } else {
                setError(result.error || 'Profile not found');
            }
        } catch (error) {
            setError('Failed to load profile');
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Stack spacing={3} maxWidth="600px" margin="0 auto" padding={3}>
                <Paper elevation={3} sx={{ padding: 3 }}>
                    <Stack spacing={2} alignItems="center">
                        <Alert severity="error" sx={{ width: '100%' }}>
                            {error}
                        </Alert>
                        <Typography variant="h6" textAlign="center">
                            Unable to load profile
                        </Typography>
                        <Typography variant="body2" color="text.secondary" textAlign="center">
                            This QR code may not be linked to a customer yet, or the customer hasn't created their motto.
                        </Typography>
                        <Link href="/">
                            <Button variant="contained">Go Home</Button>
                        </Link>
                    </Stack>
                </Paper>
            </Stack>
        );
    }

    return (
        <Stack spacing={3} maxWidth="600px" margin="0 auto" padding={3}>
            <Typography variant="h4" textAlign="center" gutterBottom>
                Your Profile
            </Typography>

            <Paper elevation={3} sx={{ padding: 3 }}>
                <Stack spacing={3} alignItems="center">
                    <Typography variant="h5" textAlign="center">
                        {userProfile.userName}'s Profile
                    </Typography>

                    <Box sx={{
                        padding: 3,
                        backgroundColor: '#f5f5f5',
                        borderRadius: 2,
                        width: '100%',
                        textAlign: 'center'
                    }}>
                        <Typography variant="h6" gutterBottom>
                            Your Motto
                        </Typography>
                        <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                            "{userProfile.motto}"
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            Profile ID: {userProfile.id}
                        </Typography>
                    </Box>

                    <Alert severity="info" sx={{ width: '100%' }}>
                        Thanks for scanning your t-shirt! This is your personal motto that you created.
                    </Alert>

                    <Link href="/">
                        <Button variant="contained" fullWidth>
                            Go Home
                        </Button>
                    </Link>
                </Stack>
            </Paper>
        </Stack>
    );
}
