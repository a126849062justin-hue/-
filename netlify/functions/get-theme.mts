import { getStore } from '@netlify/blobs';
import type { Context } from '@netlify/functions';

export default async (req: Request, context: Context) => {
    try {
        const store = getStore('theme-store');
        // Retrieve the current theme from the store
        const theme = await store.get('current-theme', { type: 'text' }) || 'default';
        
        return new Response(JSON.stringify({ theme }), {
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' // Allow CORS for local dev testing
            }
        });
    } catch (error) {
        console.error("Error retrieving theme:", error);
        return new Response(JSON.stringify({ error: "Failed to retrieve theme", details: String(error) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
