'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Countdown timer for "Resend OTP" cooldowns. `start(seconds)` (re)arms it;
 * `seconds` ticks down to 0. Prevents OTP spam and duplicate verification ids.
 */
export function useResendTimer(): { seconds: number; start: (n: number) => void } {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        if (seconds <= 0) return;
        const id = setTimeout(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
        return () => clearTimeout(id);
    }, [seconds]);

    const start = useCallback((n: number) => setSeconds(n), []);

    return { seconds, start };
}
