import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const qrCodeId = searchParams.get('id');

    if (!qrCodeId) {
        return NextResponse.json({
            error: 'QR Code ID is required'
        }, { status: 400 });
    }

    // Generate the QR code URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const qrCodeUrl = `${baseUrl}/qr/${qrCodeId}`;

    return NextResponse.json({
        qrCodeId: qrCodeId,
        qrCodeUrl: qrCodeUrl,
        message: 'Use this URL to generate QR codes for t-shirt production'
    });
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { qrCodeId } = body;

        if (!qrCodeId) {
            return NextResponse.json({
                error: 'QR Code ID is required'
            }, { status: 400 });
        }

        // Generate the QR code URL
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const qrCodeUrl = `${baseUrl}/qr/${qrCodeId}`;

        return NextResponse.json({
            qrCodeId: qrCodeId,
            qrCodeUrl: qrCodeUrl,
            message: 'QR Code URL generated successfully'
        });
    } catch (error) {
        return NextResponse.json({
            error: 'Invalid request body'
        }, { status: 400 });
    }
}
