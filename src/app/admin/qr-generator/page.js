"use client"

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
// import { useAdmin } from "@/lib/useAdmin"; // Temporarily disabled
import {
    Button,
    Stack,
    Typography,
    Paper,
    Box,
    TextField,
    Alert,
    Divider,
    CircularProgress
} from "@mui/material";
import QRCode from 'react-qr-code';
import { createQRCodeForProduction } from "@/lib/mottoService";

export default function QRGeneratorPage() {
    const { user, loading } = useAuth();
    const [qrCodeId, setQrCodeId] = useState('');
    const [generatedUrl, setGeneratedUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const generateQRCodeUrl = async () => {
        if (!qrCodeId.trim()) return;

        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            // Create QR code in database
            const result = await createQRCodeForProduction(qrCodeId.trim().toUpperCase());

            if (result.success) {
                const baseUrl = window.location.origin;
                const qrCodeUrl = `${baseUrl}/qr/${qrCodeId.trim().toUpperCase()}`;
                setGeneratedUrl(qrCodeUrl);
                setMessage({ type: 'success', text: 'QR code created and saved to database successfully!' });
            } else {
                setMessage({ type: 'error', text: result.error });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to create QR code' });
            console.error('Error creating QR code:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                <Typography>Loading...</Typography>
            </Box>
        );
    }

    if (!user) {
        return (
            <Stack spacing={3} maxWidth="800px" margin="0 auto" padding={3}>
                <Paper elevation={3} sx={{ padding: 3 }}>
                    <Typography variant="h6">Please sign in to access this page</Typography>
                </Paper>
            </Stack>
        );
    }

    return (
        <Stack spacing={3} maxWidth="800px" margin="0 auto" padding={3}>
            <Typography variant="h4" textAlign="center" gutterBottom>
                QR Code URL Generator
            </Typography>

            {message.text && (
                <Alert severity={message.type} onClose={() => setMessage({ type: '', text: '' })}>
                    {message.text}
                </Alert>
            )}

            <Alert severity="info" sx={{ width: '100%' }}>
                Use this tool to generate QR code URLs for t-shirt production. Enter the QR code ID that will be printed on the t-shirt label. The QR code will be saved to the database for management.
            </Alert>

            <Paper elevation={3} sx={{ padding: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Generate QR Code URL
                </Typography>
                <Stack spacing={2} direction="row" alignItems="flex-end">
                    <TextField
                        label="QR Code ID"
                        value={qrCodeId}
                        onChange={(e) => setQrCodeId(e.target.value.toUpperCase())}
                        placeholder="e.g., ABC123"
                        sx={{ flexGrow: 1 }}
                    />
                    <Button
                        variant="contained"
                        onClick={generateQRCodeUrl}
                        disabled={!qrCodeId.trim() || saving}
                    >
                        {saving ? <CircularProgress size={20} /> : 'Generate & Save QR Code'}
                    </Button>
                </Stack>
            </Paper>

            {generatedUrl && (
                <Paper elevation={3} sx={{ padding: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Generated QR Code
                    </Typography>

                    <Stack spacing={3} alignItems="center">
                        <Box sx={{
                            padding: 3,
                            backgroundColor: 'white',
                            borderRadius: 2,
                            border: '1px solid #e0e0e0'
                        }}>
                            <QRCode
                                value={generatedUrl}
                                size={256}
                                level="M"
                            />
                        </Box>

                        <Typography variant="body2" color="text.secondary" sx={{
                            wordBreak: 'break-all',
                            fontFamily: 'monospace',
                            textAlign: 'center'
                        }}>
                            {generatedUrl}
                        </Typography>

                        <Typography variant="body2" color="text.secondary" textAlign="center">
                            QR Code ID: <strong>{qrCodeId.toUpperCase()}</strong>
                        </Typography>

                        <Alert severity="success" sx={{ width: '100%' }}>
                            QR code has been saved to the database and is ready for t-shirt production. The business operator can now link this QR code to a customer using the QR Code Management panel.
                        </Alert>
                    </Stack>
                </Paper>
            )}

            <Divider />

            <Paper elevation={3} sx={{ padding: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Instructions
                </Typography>
                <Stack spacing={2}>
                    <Typography variant="body2">
                        1. <strong>Production:</strong> Use this tool to generate QR codes for t-shirt labels
                    </Typography>
                    <Typography variant="body2">
                        2. <strong>Printing:</strong> Print the generated QR code on t-shirt labels
                    </Typography>
                    <Typography variant="body2">
                        3. <strong>Linking:</strong> When customer creates their motto, business operator scans QR code and links it to customer email
                    </Typography>
                    <Typography variant="body2">
                        4. <strong>Customer Use:</strong> Customer scans QR code on t-shirt to view their profile
                    </Typography>
                </Stack>
            </Paper>
        </Stack>
    );
}
