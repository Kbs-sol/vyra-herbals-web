import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body || {};
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    
    // Find user by email
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);
    
    if (error) {
      console.error('Login error:', error);
      return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
    
    const user = users?.[0];
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Simple password check (in production, use proper hashing like bcrypt)
    if (user.password !== password) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    
    return NextResponse.json({ 
      success: true,
      user: userWithoutPassword 
    });
  } catch (err) {
    console.error('Login exception:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
