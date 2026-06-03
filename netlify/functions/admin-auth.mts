import type { Context } from '@netlify/functions';

const SESSION_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

export default async (req: Request, _context: Context) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const adminPassword = Netlify.env.get('ADMIN_PASSWORD');
    if (!adminPassword) {
        return new Response(JSON.stringify({ error: '伺服器設定錯誤' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    let body: { password?: string };
    try {
        body = await req.json();
    } catch {
        return new Response(JSON.stringify({ error: '請求格式錯誤' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const { password } = body;
    if (!password || password !== adminPassword) {
        return new Response(JSON.stringify({ error: '密碼錯誤' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Generate a time-limited session token using HMAC-SHA256
    const expiresAt = Date.now() + SESSION_DURATION_MS;
    const payload = `${expiresAt}`;
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(adminPassword),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    const sigHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    const token = `${expiresAt}.${sigHex}`;

    return new Response(JSON.stringify({ token, expiresAt }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });
};

export const config = {
    path: '/api/admin-auth',
};
