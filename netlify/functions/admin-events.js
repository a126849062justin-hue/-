// Admin Events - analytics dashboard for user events (CTA clicks, scroll, engagement)
// Requires ADMIN_PASSWORD

exports.handler = async (event) => {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }

    const password = event.queryStringParameters?.password;
    if (!password || password !== process.env.ADMIN_PASSWORD) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    // If Supabase not configured, return mock data
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                todaySummary: { total: 0, cta_click: 0, scroll: 0, engagement: 0, conversion: 0 },
                topCTAs: [],
                scrollDepth: { '25': 0, '50': 0, '75': 0, '100': 0 },
                hourlyTrend: [],
                recentEvents: [],
                conversionFunnel: { pageViews: 0, ctaClicks: 0, bookingStarts: 0, bookingCompletes: 0 },
            })
        };
    }

    try {
        const { createClient } = require("@supabase/supabase-js");
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

        // Today's date boundaries (UTC+8)
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(todayStart.getHours() + 8); // shift to TW time
        todayStart.setHours(0, 0, 0, 0);
        todayStart.setHours(todayStart.getHours() - 8); // back to UTC
        const todayISO = todayStart.toISOString();

        // Week boundaries
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 7);
        const weekISO = weekStart.toISOString();

        // 1. Today's event summary by category
        const { data: todayEvents } = await supabase
            .from("user_events")
            .select("category, event_name, metadata")
            .gte("created_at", todayISO);

        const summary = { total: 0, cta_click: 0, scroll: 0, engagement: 0, conversion: 0, navigation: 0 };
        const ctaCounts = {};
        const scrollCounts = { '25': 0, '50': 0, '75': 0, '100': 0 };

        if (todayEvents) {
            todayEvents.forEach(e => {
                summary.total++;
                if (summary[e.category] !== undefined) summary[e.category]++;

                if (e.category === 'cta_click') {
                    ctaCounts[e.event_name] = (ctaCounts[e.event_name] || 0) + 1;
                }
                if (e.category === 'scroll') {
                    if (scrollCounts[e.event_name] !== undefined) scrollCounts[e.event_name]++;
                }
            });
        }

        // Top CTAs sorted by count
        const topCTAs = Object.entries(ctaCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // 2. Hourly trend (past 24 hours)
        const { data: last24h } = await supabase
            .from("user_events")
            .select("created_at, category")
            .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        const hourlyBuckets = {};
        for (let i = 0; i < 24; i++) {
            const h = String(i).padStart(2, '0');
            hourlyBuckets[h] = 0;
        }

        if (last24h) {
            last24h.forEach(e => {
                const d = new Date(e.created_at);
                d.setHours(d.getHours() + 8); // TW time
                const h = String(d.getHours()).padStart(2, '0');
                hourlyBuckets[h] = (hourlyBuckets[h] || 0) + 1;
            });
        }

        const hourlyTrend = Object.entries(hourlyBuckets).map(([hour, count]) => ({ hour, count }));

        // 3. Recent events (last 20)
        const { data: recentEvents } = await supabase
            .from("user_events")
            .select("category, event_name, page_url, device_type, metadata, created_at")
            .order("created_at", { ascending: false })
            .limit(20);

        // 4. Conversion funnel (past 7 days)
        const { data: weekPageViews, count: pvCount } = await supabase
            .from("page_views")
            .select("id", { count: 'exact', head: true })
            .gte("created_at", weekISO);

        const { data: weekCTAs } = await supabase
            .from("user_events")
            .select("event_name")
            .eq("category", "cta_click")
            .gte("created_at", weekISO);

        const { data: weekConversions } = await supabase
            .from("user_events")
            .select("event_name")
            .eq("category", "conversion")
            .gte("created_at", weekISO);

        const bookingStarts = weekConversions?.filter(e => e.event_name === 'booking_start').length || 0;
        const bookingCompletes = weekConversions?.filter(e => e.event_name === 'booking_complete').length || 0;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                todaySummary: summary,
                topCTAs,
                scrollDepth: scrollCounts,
                hourlyTrend,
                recentEvents: (recentEvents || []).map(e => ({
                    category: e.category,
                    eventName: e.event_name,
                    pageUrl: e.page_url,
                    deviceType: e.device_type,
                    metadata: e.metadata,
                    createdAt: e.created_at,
                })),
                conversionFunnel: {
                    pageViews: pvCount || 0,
                    ctaClicks: weekCTAs?.length || 0,
                    bookingStarts,
                    bookingCompletes,
                },
            })
        };
    } catch (error) {
        console.error("admin-events error:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error" }) };
    }
};
