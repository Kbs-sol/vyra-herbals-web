import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/cart?error=payment_failed_or_cancelled`, 303);
}
