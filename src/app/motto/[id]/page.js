"use client"

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    Box,
    Button,
    CircularProgress,
    Paper,
    Stack,
    Typography,
    Alert
} from "@mui/material";
import { useAuth } from "@/lib/AuthContext";
import { getMottoById, getMottoLikeStatus, likeMotto } from "@/lib/mottoService";

export default function MottoSharePage() {
    const params = useParams();
    const { user, loading, signInWithGoogle } = useAuth();
    const [motto, setMotto] = useState(null);
    const [loadingMotto, setLoadingMotto] = useState(true);
    const [error, setError] = useState('');
    const [likeCount, setLikeCount] = useState(0);
    const [liked, setLiked] = useState(false);
    const [liking, setLiking] = useState(false);
    const [copyStatus, setCopyStatus] = useState('');

    useEffect(() => {
        const loadMotto = async () => {
            if (!params.id || loading) return;
            setLoadingMotto(true);
            setError('');
            try {
                const result = await getMottoById(params.id, user);
                if (result.success) {
                    setMotto(result.motto);
                    setLikeCount(result.motto.likeCount || 0);

                    if (user) {
                        const likeStatus = await getMottoLikeStatus(params.id, user);
                        if (likeStatus.success) {
                            setLiked(likeStatus.liked);
                        }
                    } else {
                        setLiked(false);
                    }
                } else {
                    setError(result.error || 'Motto not found');
                }
            } catch (err) {
                console.error('Error loading motto:', err);
                setError('Failed to load motto');
            } finally {
                setLoadingMotto(false);
            }
        };

        loadMotto();
    }, [params.id, user, loading]);

    const handleCopy = async () => {
        const link = typeof window !== 'undefined' ? window.location.href : '';
        if (!link) return;
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(link);
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

    const handleLike = async () => {
        if (!user || liking) return;
        setLiking(true);
        try {
            const result = await likeMotto(params.id, user);
            if (result.success) {
                setLiked(true);
                if (!result.alreadyLiked) {
                    setLikeCount(result.likeCount || likeCount + 1);
                }
            } else {
                setError(result.error || 'Failed to like this motto');
            }
        } catch (err) {
            console.error('Error liking motto:', err);
            setError('Failed to like this motto');
        } finally {
            setLiking(false);
        }
    };

    if (loading || loadingMotto) {
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
                        {error === 'This motto is private' && !user && (
                            <Button variant="contained" onClick={signInWithGoogle}>
                                Sign in to view
                            </Button>
                        )}
                        <Link href="/">
                            <Button variant="outlined">Go Home</Button>
                        </Link>
                    </Stack>
                </Paper>
            </Stack>
        );
    }

    if (!motto) {
        return null;
    }

    return (
        <Box
            sx={{
                width: '100%',
                minHeight: 'calc(100vh - 120px)',
                padding: { xs: 3, md: 6 },
                position: 'relative',
                color: '#121212',
                background: 'linear-gradient(120deg, #fef9f5 0%, #eaf0ff 55%, #f6f9f0 100%)',
                overflowX: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    width: 320,
                    height: 320,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,160,150,0.35), rgba(255,160,150,0))',
                    top: -110,
                    left: -80,
                    filter: 'blur(2px)',
                },
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    width: 360,
                    height: 360,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(140,200,255,0.35), rgba(140,200,255,0))',
                    bottom: -140,
                    right: -120,
                    filter: 'blur(2px)',
                },
            }}
        >
            <Box sx={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                <Stack spacing={3}>
                    <Stack spacing={1}>
                        <Typography variant="overline" sx={{ letterSpacing: '0.2em', color: '#6b7280' }}>
                            Shareable Motto
                        </Typography>
                        <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                            {motto.userName}'s Motto
                        </Typography>
                    </Stack>

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
                        <Stack spacing={3}>
                            <Box
                                sx={{
                                    padding: 3,
                                    backgroundColor: '#fff7f2',
                                    borderRadius: 3,
                                    border: '1px solid rgba(255, 159, 64, 0.2)',
                                    textAlign: 'center'
                                }}
                            >
                                <Typography variant="h5" gutterBottom sx={{ fontStyle: 'italic' }}>
                                    "{motto.motto}"
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    ID: {motto.id}
                                </Typography>
                            </Box>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                                <Typography variant="body2" color="text.secondary">
                                    Likes: {likeCount}
                                </Typography>
                                <Button
                                    variant="contained"
                                    onClick={handleLike}
                                    disabled={!user || liked || liking}
                                >
                                    {liked ? 'Liked' : (liking ? 'Liking...' : 'Like')}
                                </Button>
                                <Button variant="outlined" onClick={handleCopy}>
                                    Copy Link
                                </Button>
                            </Stack>

                            {copyStatus && (
                                <Typography variant="caption" color="text.secondary">
                                    {copyStatus}
                                </Typography>
                            )}

                            {!user && (
                                <Typography variant="body2" color="text.secondary">
                                    Sign in to like this motto.
                                </Typography>
                            )}
                        </Stack>
                    </Paper>

                    <Stack direction="row" spacing={2}>
                        <Link href="/">
                            <Button variant="text">Go Home</Button>
                        </Link>
                    </Stack>
                </Stack>
            </Box>
        </Box>
    );
}
