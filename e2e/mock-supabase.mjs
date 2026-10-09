// A tiny in-memory stand-in for the Supabase REST + auth APIs, so the e2e
// suite never touches the live project. Supabase is only ever called from
// the Next server (Server Components, Server Actions, proxy.ts), so
// page.route() in the browser can't intercept it: instead the production
// build under test is pointed at this server via NEXT_PUBLIC_SUPABASE_URL.
//
// Control endpoints (test-only):
//   POST /__reset          restore the fixture data
//   POST /__empty          start from an account with no trips
//   POST /__fail {on:bool} make every /rest/v1 call fail with a 500
import http from "node:http";
import { FIXTURE_USER, freshDb } from "./fixtures.mjs";

const PORT = Number(process.env.MOCK_SUPABASE_PORT ?? 54321);

let db = freshDb();
let failRest = false;
let nextId = 1000;

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(body === undefined ? "" : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : null);
      } catch {
        resolve(null);
      }
    });
  });
}

function session() {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: FIXTURE_USER.accessToken,
    refresh_token: "e2e-refresh-token",
    token_type: "bearer",
    expires_in: 3600 * 24,
    expires_at: now + 3600 * 24,
    user: FIXTURE_USER.user,
  };
}

// ---------- PostgREST-ish filtering ----------
function applyFilters(rows, params) {
  let out = rows;
  for (const [key, value] of params) {
    if (["select", "order", "limit", "offset", "columns", "on_conflict"].includes(key)) continue;
    const dot = value.indexOf(".");
    const op = value.slice(0, dot);
    const arg = value.slice(dot + 1);
    out = out.filter((row) => {
      const v = row[key];
      switch (op) {
        case "eq":
          return String(v) === arg;
        case "neq":
          return String(v) !== arg;
        case "gte":
          return v >= arg;
        case "gt":
          return v > arg;
        case "lte":
          return v <= arg;
        case "lt":
          return v < arg;
        case "in":
          return arg.replace(/[()]/g, "").split(",").includes(String(v));
        case "is":
          return arg === "null" ? v == null : String(v) === arg;
        default:
          return true;
      }
    });
  }
  const order = params.get("order");
  if (order) {
    const [col, dir] = order.split(".");
    out = [...out].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (dir === "desc" ? -1 : 1));
  }
  const limit = params.get("limit");
  if (limit) out = out.slice(0, Number(limit));
  return out;
}

function project(rows, params) {
  const select = params.get("select");
  if (!select || select === "*") return rows;
  const cols = select.split(",").map((c) => c.trim());
  return rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]])));
}

function respondRows(req, res, rows) {
  const wantsObject = (req.headers.accept ?? "").includes("vnd.pgrst.object");
  if (wantsObject) {
    if (rows.length !== 1) {
      return send(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" });
    }
    return send(res, 200, rows[0]);
  }
  return send(res, 200, rows);
}

function withDefaults(table, row) {
  const base = { id: `${table}-${nextId++}`, created_at: new Date().toISOString() };
  if (table === "trips") Object.assign(base, { share_token: `share-${nextId}`, share_enabled: false });
  if (table === "packing_items") Object.assign(base, { checked: false });
  return { ...base, ...row };
}

async function handleRest(req, res, url) {
  if (failRest) return send(res, 500, { code: "XX000", message: "mock outage" });
  const path = url.pathname.replace("/rest/v1/", "");
  const params = url.searchParams;

  if (path.startsWith("rpc/")) {
    const fn = path.slice(4);
    const args = (await readBody(req)) ?? {};
    if (fn === "get_shared_trip") {
      const trip = db.trips.find((t) => t.share_token === args.p_token && t.share_enabled);
      return send(res, 200, trip ?? { id: null });
    }
    if (fn === "get_shared_trip_stops") {
      const trip = db.trips.find((t) => t.share_token === args.p_token && t.share_enabled);
      return send(res, 200, trip ? db.trip_stops.filter((s) => s.trip_id === trip.id) : []);
    }
    if (fn === "add_trip_stop") {
      const position = db.trip_stops.filter((s) => s.trip_id === args.p_trip_id).length;
      db.trip_stops.push(
        withDefaults("trip_stops", {
          trip_id: args.p_trip_id,
          city: args.p_city,
          lat: args.p_lat,
          lon: args.p_lon,
          arrival_date: args.p_arrival_date,
          departure_date: args.p_departure_date,
          notes: args.p_notes,
          stop_type: args.p_stop_type,
          confirmation_number: args.p_confirmation_number,
          position,
        }),
      );
      return send(res, 200, null);
    }
    return send(res, 404, { message: `unknown rpc ${fn}` });
  }

  const table = db[path];
  if (!table) return send(res, 404, { message: `unknown table ${path}` });

  if (req.method === "GET" || req.method === "HEAD") {
    return respondRows(req, res, project(applyFilters(table, params), params));
  }
  if (req.method === "POST") {
    const body = await readBody(req);
    const rows = (Array.isArray(body) ? body : [body]).map((r) => withDefaults(path, r));
    table.push(...rows);
    return send(res, 201, rows);
  }
  if (req.method === "PATCH") {
    const body = (await readBody(req)) ?? {};
    const hit = applyFilters(table, params);
    hit.forEach((r) => Object.assign(r, body));
    return send(res, 200, hit);
  }
  if (req.method === "DELETE") {
    const hit = new Set(applyFilters(table, params));
    db[path] = table.filter((r) => !hit.has(r));
    return send(res, 200, [...hit]);
  }
  return send(res, 405, { message: "method not allowed" });
}

async function handleAuth(req, res, url) {
  const path = url.pathname.replace("/auth/v1/", "");
  if (path === "user") {
    const auth = req.headers.authorization ?? "";
    return auth === `Bearer ${FIXTURE_USER.accessToken}`
      ? send(res, 200, FIXTURE_USER.user)
      : send(res, 401, { code: "bad_jwt", message: "invalid JWT" });
  }
  if (path === "token") {
    const body = (await readBody(req)) ?? {};
    const grant = url.searchParams.get("grant_type");
    if (grant === "refresh_token") return send(res, 200, session());
    if (body.email === FIXTURE_USER.user.email && body.password === FIXTURE_USER.password) {
      return send(res, 200, session());
    }
    return send(res, 400, { error_code: "invalid_credentials", msg: "Invalid login credentials" });
  }
  if (path === "logout") return send(res, 204);
  if (path === "signup") {
    return send(res, 422, { error_code: "user_already_exists", msg: "User already registered" });
  }
  if (path === "resend") return send(res, 200, {});
  return send(res, 404, { message: `unknown auth path ${path}` });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === "/__health") return send(res, 200, { ok: true });
    if (url.pathname === "/__reset") {
      db = freshDb();
      failRest = false;
      return send(res, 200, { ok: true });
    }
    if (url.pathname === "/__empty") {
      db = { trips: [], trip_stops: [], packing_items: [] };
      return send(res, 200, { ok: true });
    }
    if (url.pathname === "/__fail") {
      failRest = Boolean((await readBody(req))?.on);
      return send(res, 200, { failRest });
    }
    if (url.pathname.startsWith("/rest/v1/")) return await handleRest(req, res, url);
    if (url.pathname.startsWith("/auth/v1/")) return await handleAuth(req, res, url);
    return send(res, 404, { message: "not mocked" });
  } catch (err) {
    return send(res, 500, { message: String(err) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`mock supabase on http://127.0.0.1:${PORT}`);
});
