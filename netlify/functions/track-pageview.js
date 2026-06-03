// Track Pageview - anonymous page view tracking, writes to Supabase page_views table
// No authentication required (public endpoint for anonymous tracking)

// Simple in-memory rate limiting (per userId, max 5 writes per minute)
const rateLimitMap = new Map();

function isRateLimited(userId) {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 5;

    if (!rateLimitMap.has(userId)) {
        rateLimitMap.set(userId, []);
    }

    // Clean old entries
    const times = rateLimitMap.get(userId).filter(t => now - t < windowMs);
    rateLimitMap.set(userId, times);

    if (times.length >= maxRequests) {
        return true;
    }

    times.push(now);
    return false;
}


exports.handler = async (event) => {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    // If Supabase is not configured, silently succeed
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    const { userId, deviceType, pageUrl, referrer, sessionDuration, isUpdate } = body;

    // Basic validation
    if (!userId || typeof userId !== 'string' || userId.length > 128) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // Rate limiting check
    if (isRateLimited(userId)) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, limited: true }) };
    }

    try {
        const { createClient } = require("@supabase/supabase-js");
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

        const safeDeviceType = ['mobile', 'tablet', 'desktop'].includes(deviceType) ? deviceType : 'desktop';
        const safePageUrl = typeof pageUrl === 'string' ? pageUrl.slice(0, 500) : '/';
        const safeReferrer = typeof referrer === 'string' ? referrer.slice(0, 500) : 'direct';

        if (isUpdate && sessionDuration) {
            // Update session_duration for the most recent record from this user on this page
            const { data: existing } = await supabase
                .from("page_views")
                .select("id")
                .eq("user_id", userId)
                .eq("page_url", safePageUrl)
                .order("created_at", { ascending: false })
                .limit(1);

            if (existing && existing.length > 0) {
                await supabase
                    .from("page_views")
                    .update({ session_duration: Math.min(sessionDuration, 86400) })
                    .eq("id", existing[0].id);
            }
        } else {
            // Insert new page view
            await supabase.from("page_views").insert({
                user_id: userId,
                device_type: safeDeviceType,
                page_url: safePageUrl,
                referrer: safeReferrer,
                session_duration: 0
            });
        }

        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } catch (error) {
        console.error("track-pageview error:", error);
        // Silently succeed to not break the frontend
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }
};
