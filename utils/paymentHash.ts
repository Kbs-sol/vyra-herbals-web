import crypto from 'crypto';

export const getHash = (payload: string): string => {
    return crypto.createHash('sha512').update(payload).digest('hex');
};

export const validateHash = (
    responseHash: string,
    data: any,
    salt: string
): boolean => {
    // Logic to validate inbound hash if needed later
    return true;
};
