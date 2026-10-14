export class MessageCentral {
    private static CUSTOMER_ID = process.env.NEXT_PUBLIC_MESSAGE_CENTRAL_CUSTOMER_ID || '';
    private static KEY = process.env.MESSAGE_CENTRAL_KEY || ''; // Base64 encoded password
    private static BASE_URL = 'https://cpaas.messagecentral.com';

    private static async getAuthToken(): Promise<string> {
        // If KEY looks like a JWT, return it directly
        if (this.KEY.startsWith('eyJ')) {
            return this.KEY;
        }

        const url = `${this.BASE_URL}/auth/v1/authentication/token?customerId=${this.CUSTOMER_ID}&key=${this.KEY}&scope=NEW`;
        console.log('Fetching Message Central token from:', url.replace(this.KEY, '***'));

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'accept': '*/*',
            },
        });

        const result = await response.json();
        console.log('Message Central token response:', result);

        if (result.responseCode === 200 && result.data?.authToken) {
            return result.data.authToken;
        }
        throw new Error(result.message || 'Failed to get Message Central auth token');
    }

    static async sendOtp(mobileNumber: string): Promise<string> {
        const token = await this.getAuthToken();
        const url = `${this.BASE_URL}/verification/v3/send?countryCode=91&flowType=SMS&mobileNumber=${mobileNumber}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'authToken': token,
                'accept': '*/*',
            },
        });

        const result = await response.json();
        if (result.responseCode === 200 && result.data?.verificationId) {
            return result.data.verificationId;
        }
        throw new Error(result.message || 'Failed to send OTP');
    }

    static async verifyOtp(verificationId: string, code: string): Promise<boolean> {
        const token = await this.getAuthToken();
        const url = `${this.BASE_URL}/verification/v3/validateOtp?verificationId=${verificationId}&code=${code}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'authToken': token,
                'accept': '*/*',
            },
        });

        const result = await response.json();
        if (result.responseCode === 200 && result.data?.verificationStatus === 'VERIFICATION_COMPLETED') {
            return true;
        }
        return false;
    }
}
