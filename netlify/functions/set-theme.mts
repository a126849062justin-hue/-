import { getStore } from '@netlify/blobs';
import type { Context } from '@netlify/functions';

export default async (req: Request, context: Context) => {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const body = await req.json();
        const { theme, password } = body;

        // Simple password check. In a real application, use a robust authentication system.
        // For this demo, we use a simple hardcoded password.
        if (password !== Netlify.env.get('ADMIN_PASSWORD')) {
             return new Response(JSON.stringify({ error: '密碼錯誤 (Invalid password)' }), { 
                 status: 401,
                 headers: { 'Content-Type': 'application/json' }
             });
        }

        const validThemes = ['default', 'red', 'green', 'blue', 'purple', 'white', 'gold'];
        if (!validThemes.includes(theme)) {
            return new Response(JSON.stringify({ error: '無效的主題顏色 (Invalid theme)' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const store = getStore('theme-store');
        await store.set('current-theme', theme);

        return new Response(JSON.stringify({ success: true, theme, message: '主題顏色已更新 (Theme updated)' }), {
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' 
            }
        });
    } catch (error) {
        console.error("Error setting theme:", error);
        return new Response(JSON.stringify({ error: '無法處理請求 (Invalid request)', details: String(error) }), { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
