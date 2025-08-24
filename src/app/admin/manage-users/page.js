"use client"

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useAdmin } from "@/lib/useAdmin";
import { useSearchParams } from "next/navigation";
import {
    Button,
    Stack,
    Typography,
    Paper,
    Box,
    TextField,
    Alert,
    CircularProgress
} from "@mui/material";

export default function ManageUsersPage() {
    const { user, loading } = useAuth();
    const { isAdmin, loading: adminLoading } = useAdmin();
    const searchParams = useSearchParams();
    const bypass = searchParams.get('bypass') === 'true';
    const [uid, setUid] = useState('');
    const [role, setRole] = useState('admin');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [submitting, setSubmitting] = useState(false);

    const handleSetRole = async () => {
        if (!uid.trim()) {
            setMessage({ type: 'error', text: 'Please enter a user UID' });
            return;
        }

        setSubmitting(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await fetch('/api/admin/set-role', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ uid: uid.trim(), role }),
            });

            const result = await response.json();

            if (response.ok) {
                setMessage({ type: 'success', text: result.message });
                setUid('');
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to set role' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to set role' });
            console.error('Error setting role:', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || adminLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                <CircularProgress />
            </Box>
        );
    }

    if (!user) {
        return (
            <Stack spacing={3} maxWidth="600px" margin="0 auto" padding={3}>
                <Paper elevation={3} sx={{ padding: 3 }}>
                    <Typography variant="h6">Please sign in to access this page</Typography>
                </Paper>
            </Stack>
        );
    }

    if (!isAdmin && !bypass) {
        return (
            <Stack spacing={3} maxWidth="600px" margin="0 auto" padding={3}>
                <Paper elevation={3} sx={{ padding: 3 }}>
                    <Typography variant="h6">Access Denied</Typography>
                    <Typography variant="body2" color="text.secondary">
                        You don't have permission to access this admin panel.
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        For initial setup, use: /admin/manage-users?bypass=true
                    </Typography>
                </Paper>
            </Stack>
        );
    }

    return (
        <Stack spacing={3} maxWidth="600px" margin="0 auto" padding={3}>
            <Typography variant="h4" textAlign="center" gutterBottom>
                Manage User Roles
            </Typography>

            {bypass && (
                <Alert severity="warning" sx={{ width: '100%' }}>
                    <Typography variant="body2">
                        <strong>Initial Setup Mode:</strong> You are accessing this page with bypass=true.
                        This should only be used for initial admin setup. Remove the bypass parameter after setting up your first admin user.
                    </Typography>
                </Alert>
            )}

            {message.text && (
                <Alert severity={message.type} onClose={() => setMessage({ type: '', text: '' })}>
                    {message.text}
                </Alert>
            )}

            <Paper elevation={3} sx={{ padding: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Set User Role
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Enter a user's UID to set their role. Only set admin roles for trusted users.
                </Typography>

                <Stack spacing={2}>
                    <TextField
                        fullWidth
                        label="User UID"
                        value={uid}
                        onChange={(e) => setUid(e.target.value)}
                        placeholder="Enter user UID"
                        helperText="You can find the UID in Firebase Console or from the user's profile"
                    />

                    <TextField
                        select
                        fullWidth
                        label="Role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        SelectProps={{
                            native: true,
                        }}
                    >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </TextField>

                    <Button
                        variant="contained"
                        onClick={handleSetRole}
                        disabled={!uid.trim() || submitting}
                        fullWidth
                    >
                        {submitting ? <CircularProgress size={20} /> : 'Set Role'}
                    </Button>
                </Stack>
            </Paper>

            <Paper elevation={3} sx={{ padding: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Instructions
                </Typography>
                <Stack spacing={2}>
                    <Typography variant="body2">
                        1. <strong>Find User UID:</strong> Go to Firebase Console → Authentication → Users to find the UID
                    </Typography>
                    <Typography variant="body2">
                        2. <strong>Set Role:</strong> Enter the UID and select the desired role
                    </Typography>
                    <Typography variant="body2">
                        3. <strong>Admin Access:</strong> Admin users can access QR code management and generation
                    </Typography>
                    <Typography variant="body2">
                        4. <strong>Security:</strong> Only grant admin access to trusted users
                    </Typography>
                </Stack>
            </Paper>
        </Stack>
    );
}
