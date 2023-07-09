import { Event } from "@decklist/api";

interface Env {
    db: KVNamespace,
    content: R2Bucket,
}

async function pbkdf2(password: string, iterations = 1e5): Promise<string> {
    const pwUtf8 = new TextEncoder().encode(password);
    const pwKey = await crypto.subtle.importKey('raw', pwUtf8, 'PBKDF2', false, ['deriveBits']);

    const saltUint8 = crypto.getRandomValues(new Uint8Array(16));

    const params = { name: 'PBKDF2', hash: 'SHA-256', salt: saltUint8, iterations: iterations };
    const keyBuffer = await crypto.subtle.deriveBits(params, pwKey, 256);

    const keyArray = Array.from(new Uint8Array(keyBuffer));

    const saltArray = Array.from(new Uint8Array(saltUint8));

    const iterHex = ('000000' + iterations.toString(16)).slice(-6);
    const iterArray = iterHex.match(/.{2}/g).map(byte => parseInt(byte, 16));

    const compositeArray = [].concat(saltArray, iterArray, keyArray);
    const compositeStr = compositeArray.map(byte => String.fromCharCode(byte)).join('');
    const compositeBase64 = btoa('v01' + compositeStr);

    return compositeBase64;
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request, waitUntil }) => {
    const json = await request.json<any>();
    const password = json.password as string;
    const name = json.name as string;
    const slug = params.slug as string;

    if (!slug)
        return new Response("Missing event slug", { status: 400, statusText: "Bad Request" });

    if (!password)
        return new Response("Missing password data", { status: 400, statusText: "Bad Request" });

    const existingEvent = await env.db.get(`events:${slug}`);
    if (existingEvent != null) {
        return new Response(`${slug} already exists`, { status: 409, statusText: "Conflict" });
    }

    const passwordHash = await pbkdf2(password);
    const event: Event = {
        passwordHash
    };
    waitUntil(env.db.put(`events:${slug}`, JSON.stringify(event), { metadata: { name } }));

    return new Response(`Created ${slug}`, { status: 201, statusText: "Created" });
}

export const onRequestDelete: PagesFunction<Env> = async ({ env, params, waitUntil }) => {
    const slug = params.slug as string;
    if (!slug)
        return new Response("Missing event slug", { status: 400, statusText: "Bad Request" });

    const entries = await env.db.list({ prefix: `event:${slug}:entry:` });
    const deleteEntries = entries.keys.map(e => env.db.delete(e.name));

    const attachments = (await Promise.all(entries.keys
        .map(e => e.name.split(`event:${slug}:entry:`, 1)[1])
        .map(id => env.content.list({ prefix: `attachment:${id}:` }))
    )).flatMap(objs => objs.objects);
    const deleteAttachments = attachments.map(attachment => env.content.delete(attachment.key));

    waitUntil(Promise.all([
        env.db.delete(`events:${slug}`),
        ...deleteEntries,
        ...deleteAttachments
    ]));
    return new Response(`Deleting event ${slug} (${entries.keys.length} entries, ${attachments.length} attachments)...`, { status: 202, statusText: "Accepted" });
}