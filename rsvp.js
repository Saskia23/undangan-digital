const responseHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: responseHeaders });
}

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB;
  const eventKey = String(env.EVENT_KEY || 'wedding').slice(0, 80);

  if (!db) return json({ error: 'Database RSVP belum dihubungkan.' }, 503);

  if (request.method === 'GET') {
    try {
      const { results = [] } = await db.prepare(
        'SELECT name, status, msg, ts FROM rsvp_wishes WHERE event_key = ? ORDER BY ts DESC, id DESC LIMIT 30'
      ).bind(eventKey).all();
      return json(results.reverse());
    } catch {
      return json({ error: 'Ucapan belum dapat dimuat.' }, 503);
    }
  }

  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return json({ error: 'Content-Type harus application/json.' }, 415);
  }

  let input;
  try { input = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  const name = String(input?.name ?? '').trim();
  const status = String(input?.status ?? '');
  const msg = String(input?.msg ?? '').trim();
  const ts = Number(input?.ts) || Date.now();
  if (!name || name.length > 100 || !['Hadir', 'Tidak'].includes(status) || !msg || msg.length > 1000) {
    return json({ error: 'Nama, RSVP, atau ucapan tidak valid' }, 422);
  }

  try {
    await db.prepare(
      'INSERT INTO rsvp_wishes (event_key, name, status, msg, ts) VALUES (?, ?, ?, ?, ?)'
    ).bind(eventKey, name, status, msg, ts).run();
    await db.prepare(
      'DELETE FROM rsvp_wishes WHERE event_key = ? AND id NOT IN (SELECT id FROM rsvp_wishes WHERE event_key = ? ORDER BY ts DESC, id DESC LIMIT 30)'
    ).bind(eventKey, eventKey).run();
    const { results = [] } = await db.prepare(
      'SELECT name, status, msg, ts FROM rsvp_wishes WHERE event_key = ? ORDER BY ts DESC, id DESC LIMIT 30'
    ).bind(eventKey).all();
    return json({ ok: true, items: results.reverse() });
  } catch {
    return json({ error: 'Penyimpanan ucapan belum tersedia.' }, 503);
  }
}
