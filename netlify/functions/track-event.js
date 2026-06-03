// Track Event - anonymous user event tracking (CTA clicks, scroll depth, engagement)
// Writes to Supabase user_events table. No authentication required.

const rateLimitMap = new Map();

function isRateLimited(userId) {
    const now = Date.now();
    const windowMs = 60 * 1000;
    const maxRequests = 20; // Allow more events than pageviews

    if (!rateLimitMap.has(userId)) {
        rateLimitMap.set(userId, []);
    }

    const times = rateLimitMap.get(userId).filter(t => now - t < windowMs);
    rateLimitMap.set(userId, times);

    if (times.length >= maxRequests) return true;
    times.push(now);
    return false;
}

// Valid event categories and their allowed event names
const VALID_EVENTS = {
    cta_click: ['fitbook_booking', 'line_consult', 'phone_call', 'ig_follow', 'fb_follow', 'youtube_visit', 'pwa_install', 'trial_booking', 'pricing_view', 'coach_profile', 'schedule_view', 'class_detail', 'discount_code'],
    scroll: ['25', '50', '75', '100'],
    engagement: ['ai_chat_open', 'ai_chat_send', 'video_play', 'carousel_interact', 'faq_expand', 'share_click', 'drawer_open'],
    navigation: ['page_enter', 'page_exit', 'tab_switch', 'back_to_top'],
    conversion: ['booking_start', 'booking_complete', 'line_add', 'form_submit'],
};

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

    // Silently succeed if Supabase not configured
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    const { userId, category, eventName, pageUrl, deviceType, metadata } = body;

    // Basic validation
    if (!userId || typeof userId !== 'string' || userId.length > 128) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (!category || !VALID_EVENTS[category]) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (!eventName || typeof eventName !== 'string') {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (isRateLimited(userId)) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, limited: true }) };
    }

    try {
        const { createClient } = require("@supabase/supabase-js");
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

        const safeDeviceType = ['mobile', 'tablet', 'desktop'].includes(deviceType) ? deviceType : 'desktop';
        const safePageUrl = typeof pageUrl === 'string' ? pageUrl.slice(0, 500) : '/';
        const safeEventName = eventName.slice(0, 100);
        const safeMetadata = metadata && typeof metadata === 'object' ? metadata : {};

        await supabase.from("user_events").insert({
            user_id: userId,
            category: category,
            event_name: safeEventName,
            page_url: safePageUrl,
            device_type: safeDeviceType,
            metadata: safeMetadata,
        });

        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } catch (error) {
        console.error("track-event error:", error);
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }
};
