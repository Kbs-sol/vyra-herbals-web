import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'vyra-herbals-admin-secret-key-2024'
);

// Admin credentials (in production, store hashed in database)
const ADMIN_CREDENTIALS = {
  email: process.env.ADMIN_EMAIL || 'test@vyraherbals.com',
  password: process.env.ADMIN_PASSWORD || 'test@admin2024',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password } = body;

    if (action === 'login') {
      // Validate credentials
      if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
        // Create JWT token
        const token = await new SignJWT({ 
          email, 
          role: 'admin',
          iat: Date.now() 
        })
          .setProtectedHeader({ alg: 'HS256' })
          .setExpirationTime('24h')
          .sign(JWT_SECRET);

        // Set HTTP-only cookie
        const cookieStore = await cookies();
        cookieStore.set('admin_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 24, // 24 hours
          path: '/',
        });

        return NextResponse.json({
          success: true,
          message: 'Login successful',
          user: { email, role: 'admin' }
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid email or password' },
          { status: 401 }
        );
      }
    }

    if (action === 'logout') {
      const cookieStore = await cookies();
      cookieStore.delete('admin_token');
      return NextResponse.json({ success: true, message: 'Logged out successfully' });
    }

    if (action === 'verify') {
      const cookieStore = await cookies();
      const token = cookieStore.get('admin_token')?.value;

      if (!token) {
        return NextResponse.json(
          { success: false, error: 'No token found' },
          { status: 401 }
        );
      }

      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return NextResponse.json({
          success: true,
          user: { email: payload.email, role: payload.role }
        });
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid token' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
