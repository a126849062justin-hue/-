// Admin AI Metrics - returns KPI data for Claude & Gemini
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

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        // Return mock data if Supabase is not configured
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                claude: { successRate: 98.2, avgResponseTime: 2400, todayCount: 42 },
                gemini: { successRate: 99.1, avgResponseTime: 1800, todayCount: 31 },
                conversion: { rate: 5.2, aiInteractions: 73, newBookings: 4 },
                monthlyCost: { total: 285, claude: 180, gemini: 105 },
                note: "Supabase 未配置，顯示模擬數據",
            }),
        };
    }

    try {
        const { createClient } = require("@supabase/supabase-js");
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

        const today = new Date().toISOString().split("T")[0];
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

        // Today's interactions
        const { data: todayData } = await supabase
            .from("ai_interactions")
            .select("engine, response_time, success")
            .gte("created_at", today);

        const claudeToday = (todayData || []).filter((r) => r.engine === "claude");
        const geminiToday = (todayData || []).filter((r) => r.engine === "gemini");

        const calcMetrics = (rows) => ({
            successRate: rows.length
                ? Math.round((rows.filter((r) => r.success).length / rows.length) * 1000) / 10
                : 0,
            avgResponseTime: rows.length
                ? Math.round(rows.reduce((s, r) => s + (r.response_time || 0), 0) / rows.length)
                : 0,
            todayCount: rows.length,
        });

        // Monthly cost (approximate: Claude $0.0008/1k input tokens, Gemini $0.00015/1k)
        const { data: monthData } = await supabase
            .from("ai_interactions")
            .select("engine, tokens_input, tokens_output")
            .gte("created_at", monthStart);

        const claudeCost = ((monthData || [])
            .filter((r) => r.engine === "claude")
            .reduce((s, r) => s + (r.tokens_input || 150) * 0.0008 / 1000 + (r.tokens_output || 100) * 0.0024 / 1000, 0))
            .toFixed(2);

        const geminiCost = ((monthData || [])
            .filter((r) => r.engine === "gemini")
            .reduce((s, r) => s + ((r.tokens_input || 150) + (r.tokens_output || 100)) * 0.00015 / 1000, 0))
            .toFixed(2);

        // Conversion from bookings table
        const { count: bookingCount } = await supabase
            .from("bookings")
            .select("id", { count: "exact" })
            .gte("created_at", monthStart);

        const totalInteractions = (monthData || []).length;
        const conversionRate = totalInteractions
            ? Math.round((bookingCount / totalInteractions) * 1000) / 10
            : 0;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                claude: calcMetrics(claudeToday),
                gemini: calcMetrics(geminiToday),
                conversion: {
                    rate: conversionRate,
                    aiInteractions: totalInteractions,
                    newBookings: bookingCount || 0,
                },
                monthlyCost: {
                    total: (parseFloat(claudeCost) + parseFloat(geminiCost)).toFixed(2),
                    claude: claudeCost,
                    gemini: geminiCost,
                },
            }),
        };
    } catch (error) {
        console.error("admin-ai-metrics error:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
