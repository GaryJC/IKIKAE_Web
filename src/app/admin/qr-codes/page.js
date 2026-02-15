"use client"

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
// import { useAdmin } from "@/lib/useAdmin"; // Temporarily disabled
import {
    Button,
    Stack,
    Typography,
    Paper,
    Box,
    CircularProgress,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton
} from "@mui/material";
import QRCode from 'react-qr-code';
import {
    linkQRCodeToUser,
    getAllQRCodes,
    getQRCodeById
} from "@/lib/mottoService";

export default function QRCodeManagementPage() {
    const { user, loading } = useAuth();
    // const { isAdmin, loading: adminLoading } = useAdn(); // Temporarily disabled
    const isAdmin = true; // Temporarily allow all authenticated users
    const adminLoading = false;
    const [qrCodes, setQrCodes] = useState([]);
    const [loadingQRCodes, setLoadingQRCodes] = useState(true);
    const [scannedQRCode, setScannedQRCode] = useState('');
    const [linkDialog, setLinkDialog] = useState({ open: false, qrCodeId: '', userEmail: '' });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [scanning, setScanning] = useState(false);
    const [qrCodeViewDialog, setQrCodeViewDialog] = useState({ open: false, qrCodeId: '', qrCodeUrl: '' });

    useEffect(() => {
        if (user) {
            loadQRCodes();
        }
    }, [user]);

    const loadQRCodes = async () => {
        setLoadingQRCodes(true);
        try {
            const result = await getAllQRCodes();
            if (result.success) {
                setQrCodes(result.qrCodes);
            } else {
                setMessage({ type: 'error', text: result.error });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to load QR codes' });
        } finally {
            setLoadingQRCodes(false);
        }
    };

    const handleScanQRCode = async () => {
        if (!scannedQRCode.trim()) {
            setMessage({ type: 'error', text: 'Please enter a QR code ID' });
            return;
        }

        setScanning(true);
        try {
            const result = await getQRCodeById(scannedQRCode.trim());
            if (result.success) {
                const qrCode = result.qrCode;
                if (qrCode.isLinked) {
                    setMessage({ type: 'info', text: `QR Code ${qrCode.qrCodeId} is already linked to ${qrCode.linkedUserEmail}` });
                } else {
                    setLinkDialog({
                        open: true,
                        qrCodeId: qrCode.qrCodeId,
                        userEmail: ''
                    });
                }
            } else {
                setMessage({ type: 'error', text: result.error });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to scan QR code' });
        } finally {
            setScanning(false);
        }
    };

    const handleLinkQRCode = async () => {
        if (!linkDialog.userEmail) {
            setMessage({ type: 'error', text: 'Please enter user email' });
            return;
        }

        try {
            const result = await linkQRCodeToUser(linkDialog.qrCodeId, linkDialog.userEmail);
            if (result.success) {
                setMessage({ type: 'success', text: `QR Code ${linkDialog.qrCodeId} linked to ${linkDialog.userEmail} successfully` });
                setLinkDialog({ open: false, qrCodeId: '', userEmail: '' });
                setScannedQRCode('');
                loadQRCodes();
            } else {
                setMessage({ type: 'error', text: result.error });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to link QR code' });
        }
    };

    const handleViewQRCode = (qrCodeId) => {
        const baseUrl = window.location.origin;
        const qrCodeUrl = `${baseUrl}/qr/${qrCodeId}`;
        setQrCodeViewDialog({ open: true, qrCodeId: qrCodeId, qrCodeUrl: qrCodeUrl });
    };

    if (loading || adminLoading || loadingQRCodes) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                <CircularProgress />
            </Box>
        );
    }

    if (!user) {
        return (
            <Stack spacing={3} maxWidth="1200px" margin="0 auto" padding={3}>
                <Paper elevation={3} sx={{ padding: 3 }}>
                    <Typography variant="h6">Please sign in to access admin panel</Typography>
                </Paper>
            </Stack>
        );
    }

    if (!isAdmin) {
        return (
            <Stack spacing={3} maxWidth="1200px" margin="0 auto" padding={3}>
                <Paper elevation={3} sx={{ padding: 3 }}>
                    <Typography variant="h6">Access Denied</Typography>
                    <Typography variant="body2" color="text.secondary">
                        You don't have permission to access this admin panel.
                    </Typography>
                </Paper>
            </Stack>
        );
    }

    return (
        <Stack spacing={3} maxWidth="1200px" margin="0 auto" padding={3}>
            <Typography variant="h4" textAlign="center" gutterBottom>
                QR Code Management
            </Typography>

            {message.text && (
                <Alert severity={message.type} onClose={() => setMessage({ type: '', text: '' })}>
                    {message.text}
                </Alert>
            )}

            {/* Scan QR Code */}
            <Paper elevation={3} sx={{ padding: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Scan QR Code to Link Customer
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Enter the QR code ID from the t-shirt label to link it to a customer
                </Typography>
                <Stack spacing={2} direction="row" alignItems="flex-end">
                    <TextField
                        label="QR Code ID"
                        value={scannedQRCode}
                        onChange={(e) => setScannedQRCode(e.target.value.toUpperCase())}
                        placeholder="e.g., ABC123"
                        sx={{ flexGrow: 1 }}
                    />
                    <Button
                        variant="contained"
                        onClick={handleScanQRCode}
                        disabled={!scannedQRCode.trim() || scanning}
                    >
                        {scanning ? <CircularProgress size={20} /> : 'Scan QR Code'}
                    </Button>
                </Stack>
            </Paper>

            {/* QR Codes Table */}
            <Paper elevation={3} sx={{ padding: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Linked QR Codes
                </Typography>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>QR Code ID</TableCell>
                                <TableCell>Linked User</TableCell>
                                <TableCell>Linked At</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {qrCodes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        <Typography variant="body2" color="text.secondary">
                                            No QR codes linked yet
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                qrCodes.map((qrCode) => (
                                    <TableRow key={qrCode.id}>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                {qrCode.qrCodeId}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{qrCode.linkedUserEmail || '-'}</TableCell>
                                        <TableCell>
                                            {qrCode.linkedAt ? new Date(qrCode.linkedAt.toDate()).toLocaleString() : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {qrCode.isLinked ? (
                                                <Alert severity="success" sx={{ py: 0 }}>Linked</Alert>
                                            ) : (
                                                <Alert severity="warning" sx={{ py: 0 }}>Unlinked</Alert>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1}>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={() => handleViewQRCode(qrCode.qrCodeId)}
                                                >
                                                    View QR Code
                                                </Button>
                                                {!qrCode.isLinked && (
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => setLinkDialog({
                                                            open: true,
                                                            qrCodeId: qrCode.qrCodeId,
                                                            userEmail: ''
                                                        })}
                                                    >
                                                        Link
                                                    </Button>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Link Dialog */}
            <Dialog open={linkDialog.open} onClose={() => setLinkDialog({ open: false, qrCodeId: '', userEmail: '' })}>
                <DialogTitle>Link QR Code to Customer</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 2 }}>
                        <Typography variant="body2">
                            QR Code ID: <strong>{linkDialog.qrCodeId}</strong>
                        </Typography>
                        <TextField
                            fullWidth
                            label="Customer Email"
                            value={linkDialog.userEmail}
                            onChange={(e) => setLinkDialog({ ...linkDialog, userEmail: e.target.value })}
                            placeholder="Enter customer email"
                            type="email"
                        />
                        <Typography variant="body2" color="text.secondary">
                            This will link the QR code to the customer's profile. The customer must have already created their motto.
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLinkDialog({ open: false, qrCodeId: '', userEmail: '' })}>
                        Cancel
                    </Button>
                    <Button onClick={handleLinkQRCode} variant="contained">
                        Link Customer
                    </Button>
                </DialogActions>
            </Dialog>

            {/* QR Code View Dialog */}
            <Dialog
                open={qrCodeViewDialog.open}
                onClose={() => setQrCodeViewDialog({ open: false, qrCodeId: '', qrCodeUrl: '' })}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>QR Code: {qrCodeViewDialog.qrCodeId}</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} alignItems="center" sx={{ mt: 2 }}>
                        <Box sx={{
                            padding: 3,
                            backgroundColor: 'white',
                            borderRadius: 2,
                            border: '1px solid #e0e0e0'
                        }}>
                            <QRCode
                                value={qrCodeViewDialog.qrCodeUrl}
                                size={256}
                                level="M"
                            />
                        </Box>

                        <Typography variant="body2" color="text.secondary" sx={{
                            wordBreak: 'break-all',
                            fontFamily: 'monospace',
                            textAlign: 'center'
                        }}>
                            {qrCodeViewDialog.qrCodeUrl}
                        </Typography>

                        <Typography variant="body2" color="text.secondary" textAlign="center">
                            QR Code ID: <strong>{qrCodeViewDialog.qrCodeId}</strong>
                        </Typography>

                        <Alert severity="info" sx={{ width: '100%' }}>
                            This QR code can be printed for t-shirt labeling or shared with customers.
                        </Alert>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setQrCodeViewDialog({ open: false, qrCodeId: '', qrCodeUrl: '' })}>
                        Close
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => window.print()}
                    >
                        Print QR Code
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
}
