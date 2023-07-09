import { Entry, Event } from "../../../api";
import { getToken, getUserUnsafe } from "../../auth";

interface Env {
    db: KVNamespace
    content: R2Bucket
}

interface Metadata {
    name?: string;
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

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
    const slug = params.slug as string;

    if (!slug)
        return new Response("Missing event slug", { status: 400, statusText: "Bad Request" });

    const token = await getToken(request);
    const authorized = await env.db.get(`token:${token}:event:${slug}`);
    if (!authorized) {
        return new Response("Forbidden", { status: 403, statusText: "Forbidden" });
    }

    const event = await env.db.getWithMetadata<Metadata>(`events:${slug}`);
    const prefix = `event:${slug}:entry:`;
    const entriesKey = await env.db.list({ prefix });

    const entriesText = await Promise.all(entriesKey.keys.map(entry => env.db.get(entry.name).then(t => [entry.name.substring(prefix.length), t])));
    const entries = entriesText.map(([key, json]) => ({ ...JSON.parse(json), key }));

    return Response.json({
        name: event.metadata.name,
        entries: entries
    });
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request, waitUntil }) => {
    const json = await request.json<any>();
    const password = json.password as string;
    const name = json.name as string;
    const date = json.date as number;
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
        passwordHash,
        date
    };

    const token = await getToken(request);
    waitUntil(Promise.all([
        env.db.put(`events:${slug}`, JSON.stringify(event), { metadata: { name } }),
        env.db.put(`token:${token}:event:${slug}`, new Date().toISOString()),
    ]));

    return new Response(`Created ${slug}`, { status: 201, statusText: "Created" });
}