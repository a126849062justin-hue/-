// Admin Logs - system health check and error logs
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

    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const bearerToken = authHeader.replace('Bearer ', '');
    const params = new URLSearchParams(event.rawQuery || "");
    const queryPassword = params.get("password");
    const password = bearerToken || queryPassword;

    if (password !== process.env.ADMIN_PASSWORD) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    // Check API connectivity
    const claudeConfigured = !!process.env.ANTHROPIC_API_KEY;
    const geminiConfigured = !!process.env.GEMINI_API_KEY;
    const supabaseConfigured = !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);

    let errorLogs = [];
    let availability = 100;

    if (supabaseConfigured) {
        try {
            const { createClient } = require("@supabase/supabase-js");
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: logs } = await supabase
                .from("ai_interactions")
                .select("engine, success, created_at")
                .gte("created_at", yesterday)
                .order("created_at", { ascending: false });

            const total = (logs || []).length;
            const failed = (logs || []).filter((r) => !r.success).length;
            availability = total > 0 ? Math.round(((total - failed) / total) * 1000) / 10 : 100;

            const { data: systemLogs } = await supabase
                .from("system_logs")
                .select("engine, status, message, created_at")
                .order("created_at", { ascending: false })
                .limit(10);

            errorLogs = (systemLogs || []).map((r) => ({
                engine: r.engine,
                status: r.status,
                message: r.message,
                createdAt: r.created_at,
            }));
        } catch (err) {
            console.error("admin-logs DB error:", err.message);
        }
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            claudeStatus: claudeConfigured ? "configured" : "not_configured",
            geminiStatus: geminiConfigured ? "configured" : "not_configured",
            supabaseStatus: supabaseConfigured ? "configured" : "not_configured",
            availability,
            errorLogs,
        }),
    };
};
