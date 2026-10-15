import { PAGE_HTML } from "./html.ts";

const kv = await Deno.openKv();
const REQUIRED_REFERRALS = parseInt(Deno.env.get("REQUIRED_REFERRALS") || "2", 10);
const ADMIN_TOKEN = Deno.env.get("ADMIN_TOKEN");
const CHUNK_SIZE = 60000; // Deno KV limits values to 64KB per key

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // 1. Session identification via cookie
  const cookies = req.headers.get("cookie") || "";
  let userId = cookies.match(/user_id=([^;]+)/)?.[1];
  let isNewUser = false;
  if (!userId) {
    userId = crypto.randomUUID();
    isNewUser = true;
  }

  // 2. Track referral hits
  const refParam = url.searchParams.get("ref");
  if (refParam && refParam !== userId) {
    const visitKey = ["visited", refParam, userId];
    const alreadyVisited = await kv.get(visitKey);
    if (!alreadyVisited.value) {
      await kv.set(visitKey, true);
      const countKey = ["referrals", refParam];
      const count = (await kv.get<number>(countKey)).value || 0;
      await kv.set(countKey, count + 1);
    }
  }

  const cookieHeader = isNewUser
    ? { "Set-Cookie": `user_id=${userId}; Path=/; HttpOnly; SameSite=Lax` }
    : {};

  // Route: Landing page
  if (url.pathname === "/") {
    return new Response(PAGE_HTML, {
      headers: { "Content-Type": "text/html; charset=utf-8", ...cookieHeader },
    });
  }

  // Route: Referral status API
  if (url.pathname === "/api/status") {
    const count = (await kv.get<number>(["referrals", userId])).value || 0;
    return new Response(
      JSON.stringify({
        userId,
        referrals: count,
        required: REQUIRED_REFERRALS,
        unlocked: count >= REQUIRED_REFERRALS,
      }),
      {
        headers: { "Content-Type": "application/json", ...cookieHeader },
      }
    );
  }

  // Route: Admin PDF upload
  if (url.pathname === "/admin/upload" && req.method === "POST") {
    const auth = req.headers.get("Authorization");
    if (!ADMIN_TOKEN || auth !== `Bearer ${ADMIN_TOKEN}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const data = new Uint8Array(await req.arrayBuffer());
    if (data.length === 0) {
      return new Response("Empty file", { status: 400 });
    }

    // Clean up older chunks if present
    const existingMeta = await kv.get<{ chunks: number }>(["pdf_meta"]);
    if (existingMeta.value) {
      for (let i = 0; i < existingMeta.value.chunks; i++) {
        await kv.delete(["pdf_chunk", i]);
      }
    }

    // Store in 60KB chunks to prevent size overflow
    const totalChunks = Math.ceil(data.length / CHUNK_SIZE);
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const chunk = data.subarray(start, start + CHUNK_SIZE);
      await kv.set(["pdf_chunk", i], chunk);
    }

    await kv.set(["pdf_meta"], { chunks: totalChunks, size: data.length });
    return new Response(`Stored ${data.length} bytes in ${totalChunks} chunks.\n`);
  }

  // Route: PDF download
  if (url.pathname === "/download") {
    const count = (await kv.get<number>(["referrals", userId])).value || 0;
    if (count < REQUIRED_REFERRALS) {
      return new Response("Referral requirement not met", { status: 403 });
    }

    const meta = await kv.get<{ chunks: number; size: number }>(["pdf_meta"]);
    if (!meta.value) {
      return new Response("PDF not uploaded yet", { status: 404 });
    }

    const { chunks, size } = meta.value;
    const fullFile = new Uint8Array(size);
    let offset = 0;

    for (let i = 0; i < chunks; i++) {
      const chunk = await kv.get<Uint8Array>(["pdf_chunk", i]);
      if (chunk.value) {
        fullFile.set(chunk.value, offset);
        offset += chunk.value.length;
      }
    }

    return new Response(fullFile, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="project.pdf"',
      },
    });
  }

  return new Response("Not Found", { status: 404 });
});