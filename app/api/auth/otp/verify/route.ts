import { NextResponse } from 'next/server';
import { MessageCentral } from '@/utils/messageCentral';
import {
    supabaseAdmin,
    normalizePhone,
    phoneToEmail,
    isValidPhone,
    findPhoneUser,
    findAuthUserByEmailPaginated,
} from '@/utils/authAdmin';
import { enforceRateLimit } from '@/utils/rateLimit';
import { messageQueue } from '@/services/communications';
import { tryNormalizePhone } from '@/services/communications/utils/phoneNormalizer';

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const { phone, verificationId, code, name, password } = await req.json().catch(() => ({}));

        if (!phone || !verificationId || !code) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!password || password.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
                { status: 400 }
            );
        }

        const cleanedPhone = normalizePhone(phone);
        if (!isValidPhone(cleanedPhone)) {
            return NextResponse.json({ error: 'Enter a valid 10-digit mobile number' }, { status: 400 });
        }

        // An OTP is only a handful of digits, so without a cap on attempts it
        // can simply be guessed. Throttle per phone number and per source IP
        // before spending a verification call.
        const phoneLimited = enforceRateLimit(req, 'otp:verify:phone', 8, 15 * 60 * 1000, cleanedPhone);
        if (phoneLimited) return phoneLimited;

        const ipLimited = enforceRateLimit(req, 'otp:verify:ip', 20, 15 * 60 * 1000);
        if (ipLimited) return ipLimited;

        // Verify the OTP first — proof of phone ownership gates both account
        // creation and password reset.
        const isValid = await MessageCentral.verifyOtp(verificationId, code);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
        }

        const internalEmail = phoneToEmail(cleanedPhone);
        const trimmedName = typeof name === 'string' ? name.trim() : '';

        // Robust lookup (no listUsers page cap).
        const existing = await findPhoneUser(internalEmail);

        if (existing) {
            // Existing account: set the password (forgot-password / OTP re-login).
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
                password,
                user_metadata: {
                    name: existing.name || trimmedName || undefined,
                    phone: cleanedPhone,
                },
            });
            if (updateError) throw updateError;

            // Backfill profile fields the signup trigger may have missed.
            const profilePatch: Record<string, any> = {};
            if (!existing.name && trimmedName) profilePatch.name = trimmedName;
            if (!existing.phone) profilePatch.phone = cleanedPhone;
            if (Object.keys(profilePatch).length > 0) {
                await supabaseAdmin.from('users').update(profilePatch).eq('id', existing.id);
            }
        } else {
            // New account: name is required.
            if (!trimmedName) {
                return NextResponse.json(
                    { error: 'Name is required to create an account' },
                    { status: 400 }
                );
            }

            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: internalEmail,
                password,
                email_confirm: true,
                user_metadata: { name: trimmedName, phone: cleanedPhone },
            });

            if (createError) {
                // Race / legacy orphan: an auth user already exists for this email
                // even though the fast lookup missed it. Recover by updating it.
                const alreadyExists =
                    /already|registered|exists|duplicate/i.test(createError.message || '');
                if (alreadyExists) {
                    const authUser = await findAuthUserByEmailPaginated(internalEmail);
                    if (!authUser) throw createError;
                    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                        authUser.id,
                        { password, user_metadata: { name: trimmedName, phone: cleanedPhone } }
                    );
                    if (updateError) throw updateError;
                } else {
                    throw createError;
                }
            } else if (newUser?.user) {
                // The handle_new_user trigger only copies name; persist phone too.
                await supabaseAdmin
                    .from('users')
                    .update({ phone: cleanedPhone, name: trimmedName })
                    .eq('id', newUser.user.id);

                // Schedule 3-hour welcome promo automatically
                try {
                    const normalizedPhone = tryNormalizePhone(cleanedPhone);
                    if (normalizedPhone) {
                        const dedupeKey = `PROMO_3HR:${newUser.user.id}`;
                        const scheduledFor = new Date(Date.now() + 3 * 60 * 60 * 1000);
                        const templateName = process.env.WHATSAPP_TEMPLATE_WELCOME_PROMO ?? 'welcome_promo_3hr';
                        await messageQueue.enqueue({
                            order_id: null,
                            customer_phone: normalizedPhone,
                            message_type: 'MANUAL',
                            provider: 'whatsapp',
                            template_name: templateName,
                            parameters: [trimmedName || 'there'],
                            dedupe_key: dedupeKey,
                            scheduled_for: scheduledFor,
                        });
                        console.info(`[otp/verify] Scheduled 3-hour promo for user ${newUser.user.id} at ${scheduledFor.toISOString()}`);
                    }
                } catch (queueErr) {
                    console.error('[otp/verify] Error scheduling welcome promo:', queueErr);
                }
            }
        }

        // Sign in on the server to establish a session without leaking the password
        const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
            email: internalEmail,
            password
        });
        
        if (signInError) {
            console.error('OTP Sign In Error:', signInError);
            return NextResponse.json({ error: 'Verified, but failed to establish session' }, { status: 500 });
        }

        return NextResponse.json({ session: sessionData.session });
    } catch (error: any) {
        console.error('OTP Verify Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to verify OTP' },
            { status: 500 }
        );
    }
}
