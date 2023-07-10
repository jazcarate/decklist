import { serialize } from "cookie";
import createEvent from "../../templates/events/create.html";

import { AUTH_COOKIE, User, pbkdf2, sign } from "../auth";
import { renderFull } from "../render";

interface Env {
    db: KVNamespace,
    SIGNING_SECRET: string,
    ALL_ADMIN?: boolean
}

const ONE_MONTH = 2678400;

export const onRequestPost: PagesFunction<Env> = async ({ env, data, request, waitUntil }) => {
    const json = await request.json<any>();
    const password = json.password as string;
    const name = json.name as string;
    const date = json.date as number;
    const slug = json.slug as string;

    let user = data.user as User | null;

    if (!password)
        return new Response("Missing password data", { status: 400, statusText: "Bad Request" });

    if (!slug)
        return new Response("Missing slug data", { status: 400, statusText: "Bad Request" });

    const existingEvent = await env.db.get(`events:${slug}`);
    if (existingEvent != null) {
        return new Response(`${slug} already exists`, { status: 409, statusText: "Conflict" });
    }

    const passwordHash = await pbkdf2(password);
    const event = {
        passwordHash,
        date
    };

    const headers = new Headers();
    if (!user) {
        // TODO duplicated de [slug]/login.ts
        user = {
            token: crypto.randomUUID(),
            admin: env.ALL_ADMIN
        }

        const jwtCookie = await sign({ exp: Date.now() + ONE_MONTH, ...user }, env.SIGNING_SECRET);
        const newAuthCookie = serialize(AUTH_COOKIE, jwtCookie, {
            httpOnly: true,
            sameSite: true,
            secure: true,
            maxAge: ONE_MONTH
        });
        headers.append("Set-Cookie", newAuthCookie);
    }

    waitUntil(Promise.all([
        env.db.put(`events:${slug}`, JSON.stringify(event), { metadata: { name } }),
        env.db.put(`token:${user.token}:event:${slug}`, new Date().toISOString()),
    ]));

    const url = new URL(request.url);
    headers.append("Content-Length", "0");
    headers.append("Location", `${url.protocol}//${url.host}/events/${slug}`);
    return new Response(null, { status: 307, headers });
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
    return renderFull(createEvent);
}