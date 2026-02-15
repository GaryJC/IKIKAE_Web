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
    Divider,
    MenuItem
} from '@mui/material';
import { addMotto, getUserMotto } from '@/lib/mottoService';
import Link from 'next/link';

export default function MottoPage() {
    const { user, loading } = useAuth();
    const [motto, setMotto] = useState('');
    const [mottoId, setMottoId] = useState('');
    const [visibility, setVisibility] = useState('public');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatedId, setGeneratedId] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [existingMotto, setExistingMotto] = useState(null);
    const [loadingMotto, setLoadingMotto] = useState(true);
    const [shareUrl, setShareUrl] = useState('');
    const [copyStatus, setCopyStatus] = useState('');

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

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setShareUrl(window.location.origin);
        }
    }, []);

    const handleCopy = async (text) => {
        if (!text) return;
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                setCopyStatus('Link copied.');
            } else {
                setCopyStatus('Copy not supported.');
            }
        } catch (error) {
            console.error('Copy failed:', error);
            setCopyStatus('Copy failed.');
        } finally {
            setTimeout(() => setCopyStatus(''), 1500);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!motto.trim()) {
            setError('Please enter a motto');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const result = await addMotto({ motto, mottoId: mottoId.trim(), visibility }, user);

            if (result.success) {
                setGeneratedId(result.id);
                setSuccess(true);
                setMotto(''); // Clear the form
                setMottoId('');
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
        <Box
            sx={{
                width: '100%',
                minHeight: 'calc(100vh - 120px)',
                padding: { xs: 3, md: 6 },
                position: 'relative',
                color: '#121212',
                background: 'linear-gradient(120deg, #fdfcfb 0%, #f3e7e9 45%, #e3eeff 100%)',
                overflowX: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    width: 360,
                    height: 360,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,180,120,0.35), rgba(255,180,120,0))',
                    top: -120,
                    right: -80,
                    filter: 'blur(2px)',
                },
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    width: 420,
                    height: 420,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(120,160,255,0.35), rgba(120,160,255,0))',
                    bottom: -160,
                    left: -120,
                    filter: 'blur(2px)',
                },
            }}
        >
            <Box sx={{ maxWidth: 760, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                <Stack spacing={4}>
                    <Box>
                        <Typography
                            variant="h3"
                            sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 1 }}
                        >
                            Claim Your Motto
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#444' }}>
                            Pick a unique ID, set visibility, and share it with anyone you want.
                        </Typography>
                    </Box>

                    <Link href="/userProfile">
                        <Button variant="text" size="small">
                            ← Back to Profile
                        </Button>
                    </Link>

                    <Paper
                        elevation={0}
                        sx={{
                            padding: { xs: 3, md: 4 },
                            borderRadius: 4,
                            background: 'rgba(255,255,255,0.85)',
                            border: '1px solid rgba(0,0,0,0.08)',
                            boxShadow: '0 20px 60px rgba(15, 23, 42, 0.12)'
                        }}
                    >
                        {existingMotto ? (
                            <Stack spacing={3}>
                                <Alert severity="info">
                                    You already have a motto. Each user can only create one.
                                </Alert>

                                <Divider />

                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Your Motto
                                </Typography>

                                <Paper
                                    elevation={0}
                                    sx={{
                                        padding: 3,
                                        backgroundColor: '#fff7f2',
                                        border: '1px solid rgba(255, 159, 64, 0.2)',
                                        borderRadius: 3
                                    }}
                                >
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            fontSize: '1.15em',
                                            fontStyle: 'italic',
                                            marginBottom: 2,
                                            lineHeight: 1.6
                                        }}
                                    >
                                        "{existingMotto.motto}"
                                    </Typography>

                                    <Divider sx={{ marginY: 2 }} />

                                    <Stack spacing={1}>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>ID:</strong> {existingMotto.id}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Visibility:</strong> {existingMotto.visibility}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Created:</strong> {existingMotto.createdAt ?
                                                new Date(existingMotto.createdAt.seconds * 1000).toLocaleDateString() :
                                                'Recently'
                                            }
                                        </Typography>
                                    </Stack>
                                </Paper>

                                <Divider />

                                <Stack spacing={1}>
                                    <Typography variant="body2" color="text.secondary">
                                        Share link
                                    </Typography>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch">
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                flexGrow: 1,
                                                padding: 1.5,
                                                borderRadius: 2,
                                                border: '1px dashed rgba(0,0,0,0.2)',
                                                backgroundColor: '#f8fafc',
                                                wordBreak: 'break-all'
                                            }}
                                        >
                                            {shareUrl ? `${shareUrl}/motto/${existingMotto.id}` : 'Loading...'}
                                        </Paper>
                                        <Button
                                            variant="contained"
                                            onClick={() => handleCopy(shareUrl ? `${shareUrl}/motto/${existingMotto.id}` : '')}
                                            disabled={!shareUrl}
                                            sx={{ whiteSpace: 'nowrap' }}
                                        >
                                            Copy
                                        </Button>
                                    </Stack>
                                    {copyStatus && (
                                        <Typography variant="caption" color="text.secondary">
                                            {copyStatus}
                                        </Typography>
                                    )}
                                </Stack>
                            </Stack>
                        ) : success ? (
                            <Stack spacing={2}>
                                <Alert severity="success">
                                    Motto saved successfully!
                                </Alert>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Your Motto ID
                                </Typography>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        padding: 2,
                                        backgroundColor: '#f8fafc',
                                        fontFamily: 'monospace',
                                        fontSize: '1.1em',
                                        textAlign: 'center',
                                        wordBreak: 'break-all',
                                        borderRadius: 2,
                                        border: '1px solid rgba(0,0,0,0.1)'
                                    }}
                                >
                                    {generatedId}
                                </Paper>
                                <Typography variant="body2" color="text.secondary">
                                    Save this ID. It is now yours.
                                </Typography>
                                <Stack spacing={1}>
                                    <Typography variant="body2" color="text.secondary">
                                        Share link
                                    </Typography>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch">
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                flexGrow: 1,
                                                padding: 1.5,
                                                borderRadius: 2,
                                                border: '1px dashed rgba(0,0,0,0.2)',
                                                backgroundColor: '#f8fafc',
                                                wordBreak: 'break-all'
                                            }}
                                        >
                                            {shareUrl ? `${shareUrl}/motto/${generatedId}` : 'Loading...'}
                                        </Paper>
                                        <Button
                                            variant="contained"
                                            onClick={() => handleCopy(shareUrl ? `${shareUrl}/motto/${generatedId}` : '')}
                                            disabled={!shareUrl}
                                            sx={{ whiteSpace: 'nowrap' }}
                                        >
                                            Copy
                                        </Button>
                                    </Stack>
                                    {copyStatus && (
                                        <Typography variant="caption" color="text.secondary">
                                            {copyStatus}
                                        </Typography>
                                    )}
                                </Stack>
                            </Stack>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <Stack spacing={3}>
                                    <Stack spacing={1}>
                                        <Typography variant="body2" color="text.secondary">
                                            Motto ID
                                        </Typography>
                                        <TextField
                                            label="Claim your ID"
                                            value={mottoId}
                                            onChange={(e) => setMottoId(e.target.value)}
                                            placeholder="4-12 chars: letters, numbers, _ or -"
                                            fullWidth
                                            variant="outlined"
                                            disabled={isSubmitting}
                                            inputProps={{ maxLength: 12 }}
                                        />
                                    </Stack>

                                    <Stack spacing={1}>
                                        <Typography variant="body2" color="text.secondary">
                                            Your Motto
                                        </Typography>
                                        <TextField
                                            label="Write your motto"
                                            multiline
                                            rows={4}
                                            value={motto}
                                            onChange={(e) => setMotto(e.target.value)}
                                            placeholder="Enter your inspiring motto here..."
                                            fullWidth
                                            variant="outlined"
                                            disabled={isSubmitting}
                                        />
                                    </Stack>

                                    <TextField
                                        label="Visibility"
                                        select
                                        value={visibility}
                                        onChange={(e) => setVisibility(e.target.value)}
                                        fullWidth
                                        variant="outlined"
                                        disabled={isSubmitting}
                                    >
                                        <MenuItem value="public">Public (anyone with link)</MenuItem>
                                        <MenuItem value="private">Private (only you)</MenuItem>
                                    </TextField>

                                    {error && (
                                        <Alert severity="error">
                                            {error}
                                        </Alert>
                                    )}

                                    <Button
                                        type="submit"
                                        variant="contained"
                                        size="large"
                                        disabled={isSubmitting || !motto.trim() || !mottoId.trim()}
                                    >
                                        {isSubmitting ? 'Saving...' : 'Save Motto'}
                                    </Button>
                                </Stack>
                            </form>
                        )}
                    </Paper>

                    <Typography variant="body2" color="text.secondary" textAlign="center">
                        {existingMotto ?
                            "Your motto is stored securely and accessible via its unique link." :
                            "Each user can create only one motto. Choose your ID carefully."
                        }
                    </Typography>
                </Stack>
            </Box>
        </Box>
    );
}
