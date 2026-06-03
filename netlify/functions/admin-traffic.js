// Admin Traffic - returns page view statistics from Supabase page_views table
exports.handler = async (event) => {
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            },
            body: ""
        };
    }

    if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };

    const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

    // Require password via Authorization header or query param
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const bearerToken = authHeader.replace('Bearer ', '');
    const params = new URLSearchParams(event.rawQuery || "");
    const queryPassword = params.get("password");
    const password = bearerToken || queryPassword;

    if (password !== process.env.ADMIN_PASSWORD) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    // Mock data for when Supabase is not configured
    const mockData = {
        today: { views: 87, uniqueUsers: 34 },
        thisWeek: { views: 612, uniqueUsers: 198 },
        thisMonth: { views: 2847, uniqueUsers: 743 },
        deviceBreakdown: { mobile: 62, tablet: 12, desktop: 26 },
        topPages: [
            { url: "/index.html", views: 480 },
            { url: "/classes.html", views: 210 },
            { url: "/pricing.html", views: 175 },
            { url: "/team.html", views: 98 },
            { url: "/faq.html", views: 67 }
        ],
        topReferrers: [
            { referrer: "google.com", views: 320 },
            { referrer: "instagram.com", views: 185 },
            { referrer: "direct", views: 140 },
            { referrer: "facebook.com", views: 88 },
            { referrer: "line.me", views: 45 }
        ],
        dailyTrend: [
            { date: "03-17", views: 95 },
            { date: "03-18", views: 112 },
            { date: "03-19", views: 78 },
            { date: "03-20", views: 134 },
            { date: "03-21", views: 98 },
            { date: "03-22", views: 108 },
            { date: "03-23", views: 87 }
        ],
        note: "Supabase 未配置，顯示模擬數據"
    };

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        return { statusCode: 200, headers, body: JSON.stringify(mockData) };
    }

    try {
        const { createClient } = require("@supabase/supabase-js");
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        // Today's views
        const { data: todayData, error: todayErr } = await supabase
            .from("page_views")
            .select("user_id")
            .gte("created_at", todayStart);

        const todayViews = (todayData || []).length;
        const todayUnique = new Set((todayData || []).map(r => r.user_id)).size;

        // This week
        const { data: weekData } = await supabase
            .from("page_views")
            .select("user_id")
            .gte("created_at", weekStart);

        const weekViews = (weekData || []).length;
        const weekUnique = new Set((weekData || []).map(r => r.user_id)).size;

        // This month
        const { data: monthData } = await supabase
            .from("page_views")
            .select("user_id, device_type, page_url, referrer, created_at")
            .gte("created_at", monthStart);

        const monthRows = monthData || [];
        const monthViews = monthRows.length;
        const monthUnique = new Set(monthRows.map(r => r.user_id)).size;

        // Device breakdown (percentage)
        const deviceCounts = { mobile: 0, tablet: 0, desktop: 0 };
        monthRows.forEach(r => {
            const d = (r.device_type || 'desktop').toLowerCase();
            if (deviceCounts[d] !== undefined) deviceCounts[d]++;
        });
        const totalForDevice = monthRows.length || 1;
        const deviceBreakdown = {
            mobile: Math.round(deviceCounts.mobile / totalForDevice * 100),
            tablet: Math.round(deviceCounts.tablet / totalForDevice * 100),
            desktop: Math.round(deviceCounts.desktop / totalForDevice * 100)
        };

        // Top pages
        const pageCount = {};
        monthRows.forEach(r => {
            const url = r.page_url || '/';
            pageCount[url] = (pageCount[url] || 0) + 1;
        });
        const topPages = Object.entries(pageCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([url, views]) => ({ url, views }));

        // Top referrers
        const refCount = {};
        monthRows.forEach(r => {
            const ref = r.referrer || 'direct';
            refCount[ref] = (refCount[ref] || 0) + 1;
        });
        const topReferrers = Object.entries(refCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([referrer, views]) => ({ referrer, views }));

        // Daily trend (past 7 days)
        const dailyTrend = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const label = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
            const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
            const count = monthRows.filter(r => r.created_at >= dayStart && r.created_at < dayEnd).length;
            dailyTrend.push({ date: label, views: count });
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                today: { views: todayViews, uniqueUsers: todayUnique },
                thisWeek: { views: weekViews, uniqueUsers: weekUnique },
                thisMonth: { views: monthViews, uniqueUsers: monthUnique },
                deviceBreakdown,
                topPages,
                topReferrers,
                dailyTrend
            })
        };
    } catch (error) {
        console.error("admin-traffic error:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
