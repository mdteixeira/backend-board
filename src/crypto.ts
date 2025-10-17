import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const key = '12345678901234567890123456789012';
const iv = crypto.randomBytes(16);

export function encrypt(data: unknown) {
    const text = JSON.stringify(data);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return [iv.toString('hex'), encrypted.toString('hex')];
}
