"use client"

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import {
    Button,
    TextField,
    Typography,
    Stack,
    Paper,
    Alert,
    CircularProgress,
    Box,
    Divider
} from '@mui/material';
import { addMotto, getUserMotto } from '@/lib/mottoService';
import Link from 'next/link';

export default function MottoPage() {
    const { user, loading } = useAuth();
    const [motto, setMotto] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatedId, setGeneratedId] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [existingMotto, setExistingMotto] = useState(null);
    const [loadingMotto, setLoadingMotto] = useState(true);

    // Load user's existing motto
    useEffect(() => {
        const loadUserMotto = async () => {
            if (user) {
                setLoadingMotto(true);
                try {
                    const result = await getUserMotto(user);
                    if (result.success) {
                        setExistingMotto(result.motto);
                    }
                } catch (error) {
                    console.error('Error loading motto:', error);
                } finally {
                    setLoadingMotto(false);
                }
            } else {
                setLoadingMotto(false);
            }
        };

        loadUserMotto();
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!motto.trim()) {
            setError('Please enter a motto');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const result = await addMotto(motto, user);

            if (result.success) {
                setGeneratedId(result.id);
                setSuccess(true);
                setMotto(''); // Clear the form
            } else {
                setError(result.error || 'Failed to save motto. Please try again.');
            }
        } catch (error) {
            console.error('Error adding motto:', error);
            setError('Failed to save motto. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading || loadingMotto) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                <CircularProgress />
            </Box>
        );
    }

    if (!user) {
        return (
            <Stack spacing={2} alignItems="center">
                <Typography variant="h5">Please sign in to create a motto</Typography>
                <Link href="/">
                    <Button variant="contained">Go Home</Button>
                </Link>
            </Stack>
        );
    }

    return (
        <Stack spacing={3} maxWidth="600px" margin="0 auto" padding={3}>
            <Typography variant="h4" textAlign="center" gutterBottom>
                Create Your Motto
            </Typography>

            <Link href="/userProfile">
                <Button variant="outlined" size="small">
                    ← Back to Profile
                </Button>
            </Link>

            <Paper elevation={3} sx={{ padding: 3 }}>
                {existingMotto ? (
                    <Stack spacing={3}>
                        <Alert severity="info">
                            You already have a motto! Each user can only create one motto.
                        </Alert>

                        <Divider />

                        <Typography variant="h6" gutterBottom>
                            Your Motto:
                        </Typography>

                        <Paper
                            elevation={1}
                            sx={{
                                padding: 3,
                                backgroundColor: '#f8f9fa',
                                border: '1px solid #e9ecef'
                            }}
                        >
                            <Typography
                                variant="body1"
                                sx={{
                                    fontSize: '1.1em',
                                    fontStyle: 'italic',
                                    marginBottom: 2,
                                    lineHeight: 1.6
                                }}
                            >
                                "{existingMotto.motto}"
                            </Typography>

                            <Divider sx={{ marginY: 2 }} />

                            <Stack direction="row" spacing={3} justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                    <strong>Motto ID:</strong> {existingMotto.id}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    <strong>Created:</strong> {existingMotto.createdAt ?
                                        new Date(existingMotto.createdAt.seconds * 1000).toLocaleDateString() :
                                        'Recently'
                                    }
                                </Typography>
                            </Stack>
                        </Paper>
                    </Stack>
                ) : success ? (
                    <Stack spacing={2}>
                        <Alert severity="success">
                            Motto saved successfully!
                        </Alert>
                        <Typography variant="h6">Your Motto ID:</Typography>
                        <Paper
                            elevation={1}
                            sx={{
                                padding: 2,
                                backgroundColor: '#f5f5f5',
                                fontFamily: 'monospace',
                                fontSize: '1.1em',
                                textAlign: 'center',
                                wordBreak: 'break-all'
                            }}
                        >
                            {generatedId}
                        </Paper>
                        <Typography variant="body2" color="text.secondary">
                            Save this ID - you can use it to reference your motto!
                        </Typography>
                    </Stack>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <Stack spacing={3}>
                            <TextField
                                label="Your Motto"
                                multiline
                                rows={4}
                                value={motto}
                                onChange={(e) => setMotto(e.target.value)}
                                placeholder="Enter your inspiring motto here..."
                                fullWidth
                                variant="outlined"
                                disabled={isSubmitting}
                            />

                            {error && (
                                <Alert severity="error">
                                    {error}
                                </Alert>
                            )}

                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={isSubmitting || !motto.trim()}
                                startIcon={isSubmitting && <CircularProgress size={20} />}
                            >
                                {isSubmitting ? 'Saving...' : 'Save Motto'}
                            </Button>
                        </Stack>
                    </form>
                )}
            </Paper>

            <Typography variant="body2" color="text.secondary" textAlign="center">
                {existingMotto ?
                    "Your motto is stored securely with a unique ID for reference." :
                    "Each user can create only one motto. It will be stored securely with a unique ID."
                }
            </Typography>
        </Stack>
    );
} 