/**
 * Utility for managing cookies in the browser.
 */
class CookieUtils {
    /**
     * Sets a cookie with the specified name, value, and expiration days.
     * @param name - The name of the cookie.
     * @param value - The value of the cookie.
     * @param days - The number of days until the cookie expires.
     */
    static setCookie(name: string, value: string, days: number) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax; Secure";
    }

    /**
     * Gets the value of a cookie by name.
     * @param name - The name of the cookie.
     * @returns The value of the cookie, or null if not found.
     */
    static getCookie(name: string): string | null {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    /**
     * Deletes a cookie by name.
     * @param name - The name of the cookie.
     */
    static deleteCookie(name: string) {
        document.cookie = name + '=; Max-Age=-99999999; path=/; SameSite=Lax; Secure';
    }
}

export default CookieUtils;
