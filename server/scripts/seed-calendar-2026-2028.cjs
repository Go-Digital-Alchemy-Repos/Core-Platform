const { Pool } = require("pg");
const templates = [
  [
    "Provider Skills Training",
    "training",
    "professional_development",
    "professionals",
    "virtual",
    "single_session",
    120,
  ],
  [
    "Building Community Connections",
    "workshop",
    "community",
    "public",
    "hybrid",
    "single_session",
    90,
  ],
  [
    "Wellness and Work-Life Balance",
    "webinar",
    "wellness",
    "public",
    "virtual",
    "single_session",
    60,
  ],
  ["Mindful Transitions Class", "class", "wellness", "public", "in_person", "single_session", 60],
  [
    "Practice Growth Office Hours",
    "consultation",
    "consulting",
    "professionals",
    "virtual",
    "office_hours",
    90,
  ],
  [
    "Community Welcome Meetup",
    "community_event",
    "community",
    "public",
    "in_person",
    "drop_in",
    120,
  ],
  [
    "Resource Planning Appointment",
    "appointment",
    "support",
    "clients",
    "virtual",
    "one_on_one",
    45,
  ],
  [
    "Cross-Cultural Communication Lab",
    "workshop",
    "education",
    "public",
    "hybrid",
    "single_session",
    90,
  ],
  [
    "Digital Tools for Providers",
    "training",
    "operations",
    "professionals",
    "virtual",
    "single_session",
    90,
  ],
  [
    "Family Connections Roundtable",
    "community_event",
    "support",
    "public",
    "hybrid",
    "drop_in",
    90,
  ],
  [
    "Career Development Webinar",
    "webinar",
    "professional_development",
    "public",
    "virtual",
    "single_session",
    60,
  ],
  ["Creative Reflection Class", "class", "education", "public", "in_person", "single_session", 75],
];
const rows = [];
for (let m = 0; m < 24; m++) {
  const month = new Date(Date.UTC(2026, 8 + m, 1));
  const ym = month.toISOString().slice(0, 7);
  const count = 8 + (m % 5);
  for (let i = 0; i < count; i++) {
    const t = templates[(i + m) % templates.length];
    const day = 8 + Math.floor((i * 20) / (count - 1));
    const date = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day, 17 + (i % 4)));
    rows.push({
      title: `${t[0]} — ${month.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}`,
      slug: `calendar-demo-2026-2028-${ym}-${String(i + 1).padStart(2, "0")}`,
      description: `<p>Sample event for calendar demonstration. This is not a confirmed booking.</p><p>Explore ${t[0].toLowerCase()} through practical discussion, activities, and shared resources. Session details and facilitators will be confirmed before registration opens.</p>`,
      date: date.toISOString(),
      end_date: new Date(date.getTime() + t[6] * 60000).toISOString(),
      event_type: t[1],
      category: t[2],
      audience: t[3],
      delivery_mode: t[4],
      format: t[5],
      is_virtual: t[4] === "virtual",
      location:
        t[4] === "virtual"
          ? "Online — details to be confirmed"
          : t[4] === "hybrid"
            ? "Hybrid — venue and online details to be confirmed"
            : "In person — venue to be confirmed",
      timezone: "America/New_York",
      status: "published",
      visibility: "public",
      member_only: false,
      registration_enabled: false,
      registration_type: "free",
      capacity: 20 + i * 10,
      tags: ["calendar-demo", "calendar-demo-2026-2028"],
    });
  }
}
async function main() {
  const summary = {
    total: rows.length,
    months: Object.fromEntries(
      [...new Set(rows.map((r) => r.date.slice(0, 7)))].map((m) => [
        m,
        rows.filter((r) => r.date.startsWith(m)).length,
      ]),
    ),
    types: [...new Set(rows.map((r) => r.event_type))],
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!process.argv.includes("--apply")) return;
  if (!process.env.DATABASE_URL) throw Error("DATABASE_URL is required with --apply");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const before = await client.query("SELECT count(*)::int AS count FROM events");
    let inserted = 0;
    for (const row of rows) {
      const keys = Object.keys(row);
      const values = keys.map((k) => (k === "tags" ? JSON.stringify(row[k]) : row[k]));
      const result = await client.query(
        `INSERT INTO events (${keys.map((k) => '"' + k + '"').join(",")}) VALUES (${keys.map((_, i) => "$" + (i + 1)).join(",")}) ON CONFLICT (slug) DO NOTHING RETURNING id`,
        values,
      );
      inserted += result.rowCount;
    }
    const verified = await client.query(
      "SELECT to_char(date,'YYYY-MM') AS month,count(*)::int AS count,count(DISTINCT event_type)::int AS types FROM events WHERE slug LIKE 'calendar-demo-2026-2028-%' GROUP BY 1 ORDER BY 1",
    );
    if (verified.rows.length !== 24 || verified.rows.some((r) => r.count < 8 || r.count > 12))
      throw Error("Unexpected seed counts");
    await client.query("COMMIT");
    console.log(
      JSON.stringify({ before: before.rows[0].count, inserted, verified: verified.rows }, null, 2),
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
