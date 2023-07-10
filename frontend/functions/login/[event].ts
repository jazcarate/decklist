import { getUser } from "../auth.js";

interface Env {
    db: KVNamespace
}

async function pbkdf2Verify(key: string, password: string): Promise<boolean> {
    let compositeStr = null;
    try { compositeStr = atob(key); } catch (e) { throw new Error('Invalid key'); }

    const version = compositeStr.slice(0, 3);
    const saltStr = compositeStr.slice(3, 19);
    const iterStr = compositeStr.slice(19, 22);
    const keyStr = compositeStr.slice(22, 54);

    if (version != 'v01') throw new Error('Invalid key');

    const saltUint8 = new Uint8Array(saltStr.match(/./g).map(ch => ch.charCodeAt(0)));

    const iterHex = iterStr.match(/./g).map(ch => ch.charCodeAt(0).toString(16)).join('');
    const iterations = parseInt(iterHex, 16);

    const pwUtf8 = new TextEncoder().encode(password);
    const pwKey = await crypto.subtle.importKey('raw', pwUtf8, 'PBKDF2', false, ['deriveBits']);

    const params = { name: 'PBKDF2', hash: 'SHA-256', salt: saltUint8, iterations: iterations };
    const keyBuffer = await crypto.subtle.deriveBits(params, pwKey, 256);
    const keyArray = Array.from(new Uint8Array(keyBuffer));
    const keyStrNew = keyArray.map(byte => String.fromCharCode(byte)).join('');

    return keyStrNew == keyStr;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params, waitUntil }) => {
    const json = await request.json<any>();

    const password = json.password as string;
    const eventSlug = params.event as string;

    if (!eventSlug)
        return new Response("Missing event slug", { status: 400, statusText: "Bad Request" });

    if (!password)
        return new Response("Missing password data", { status: 400, statusText: "Bad Request" });

    const user = await getUser(request, env.db);
    if (user == "Unauthorized")
        return new Response("Unauthorized", { status: 401, statusText: "Unauthorized" });
    if (user == "Forbidden")
        return new Response("Forbidden", { status: 403, statusText: "Forbidden" });

    const event = JSON.parse(await env.db.get(`events:${eventSlug}`));

    if (!event)
        return new Response("Forbidden", { status: 403, statusText: "Forbidden" });


    if (!await pbkdf2Verify(event.passwordHash, password)) {
        waitUntil(env.db.delete(`token:${user.token}:event:${eventSlug}`));
        return new Response("Forbidden", { status: 403, statusText: "Forbidden" });
    }

    waitUntil(env.db.put(`token:${user.token}:event:${eventSlug}`, new Date().toISOString()));

    return Response.json({ ok: true });
}
