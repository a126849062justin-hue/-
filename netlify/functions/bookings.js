// Booking API for HCF - Supabase persistent storage with in-memory fallback

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) return null;
  const { createClient } = require("@supabase/supabase-js");
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

// ── Supabase-backed operations ─────────────────────────────────────

async function getSlotsSupa(supabase, date) {
  let query = supabase.from("bookings").select("course, status, created_at");
  if (date) {
    query = query.gte("created_at", `${date}T00:00:00+08:00`)
                 .lt("created_at", `${date}T23:59:59+08:00`);
  }
  const { data } = await query;
  return data || [];
}

async function createBookingSupa(supabase, payload) {
  const { course, name, price, phone, source } = payload;

  if (!course || typeof course !== 'string') {
    const err = new Error("course is required");
    err.statusCode = 400;
    throw err;
  }

  const customerName = (name || "匿名").toString().slice(0, 50);
  const customerPhone = (phone || "").toString().slice(0, 20);
  const bookingPrice = typeof price === 'number' ? price : 0;
  const bookingSource = (source || 'website').toString().slice(0, 50);

  const { data, error } = await supabase.from("bookings").insert({
    course: course.slice(0, 100),
    price: bookingPrice,
    status: 'pending',
    ai_recommended: bookingSource === 'ai_chat',
    ai_engine: bookingSource === 'ai_chat' ? (payload.aiEngine || null) : null,
  }).select().single();

  if (error) throw error;

  return {
    id: data.id,
    course: data.course,
    name: customerName,
    phone: customerPhone,
    price: data.price,
    status: data.status,
    source: bookingSource,
    createdAt: data.created_at,
  };
}

// ── In-memory fallback (demo mode) ────────────────────────────────

const DEMO_SCHEDULE = [
  { id: "mt-trial", title: "泰拳團課體驗", price: 400, capacity: 20 },
  { id: "kb-trial", title: "踢拳團課體驗", price: 400, capacity: 20 },
  { id: "private-1", title: "私教體驗 1堂", price: 1400, capacity: 999 },
  { id: "private-2", title: "私教體驗 2堂", price: 2400, capacity: 999 },
];
const bookedCounts = new Map();

function demoSlots() {
  return DEMO_SCHEDULE.map(s => ({
    ...s,
    available: s.capacity - (bookedCounts.get(s.id) || 0),
  }));
}

function demoBook(payload) {
  const slot = DEMO_SCHEDULE.find(s => s.id === payload.slotId);
  if (!slot) { const err = new Error("Slot not found"); err.statusCode = 404; throw err; }

  bookedCounts.set(slot.id, (bookedCounts.get(slot.id) || 0) + 1);

  return {
    id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    course: slot.title,
    name: (payload.name || "匿名").slice(0, 50),
    price: slot.price,
    status: 'pending',
    source: 'demo',
    createdAt: new Date().toISOString(),
    demo: true,
  };
}

// ── Handler ────────────────────────────────────────────────────────

exports.handler = async function handler(event) {
  const headers = { ...CORS_HEADERS, "Content-Type": "application/json" };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  const supabase = getSupabase();

  try {
    if (event.httpMethod === "GET") {
      const date = event.queryStringParameters?.date;

      if (supabase) {
        const bookings = await getSlotsSupa(supabase, date);
        return {
          statusCode: 200, headers,
          body: JSON.stringify({
            data: bookings,
            meta: { date, timezone: "Asia/Taipei", persistent: true },
          }),
        };
      }

      // Fallback: demo
      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          data: demoSlots(),
          meta: { timezone: "Asia/Taipei", persistent: false, note: "Demo mode: Supabase not configured" },
        }),
      };
    }

    if (event.httpMethod === "POST") {
      let payload;
      try { payload = JSON.parse(event.body || "{}"); }
      catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) }; }

      if (supabase) {
        const booking = await createBookingSupa(supabase, payload);
        return { statusCode: 201, headers, body: JSON.stringify({ booking }) };
      }

      // Fallback: demo
      const booking = demoBook(payload);
      return { statusCode: 201, headers, body: JSON.stringify({ booking }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
  } catch (err) {
    return {
      statusCode: err.statusCode || 500, headers,
      body: JSON.stringify({ error: err.message || "Server error" }),
    };
  }
};
