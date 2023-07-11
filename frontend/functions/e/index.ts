import { serialize } from "cookie";
import createEvent from "../../templates/events/create.html";
import createdEvent from "../../templates/events/created.html";

import { AUTH_COOKIE, User, pbkdf2, sign } from "../auth";
import { renderFull, renderPartial } from "../render";

interface Env {
    db: KVNamespace,
    SIGNING_SECRET: string,
    ALL_ADMIN?: boolean
}

const ONE_MONTH = 2678400;

export const onRequestPost: PagesFunction<Env> = async ({ env, data, request, waitUntil }) => {
    const json = await request.formData();
    const password = json.get("password")
    const name = json.get("name");
    const slug = json.get("slug");

    const view = { title: "New event", slug, password, name };

    let user = data.user as User | null;

    if (!password || !slug)
        return renderPartial(createEvent, { view: { ...view, validated: true, } });

    const existingEvent = await env.db.get(`events:${slug}`);
    if (existingEvent != null) {
        return renderPartial(createEvent, { view: { ...view, slugExists: true, validated: true, } });
    }

    const passwordHash = await pbkdf2(password);
    const event = {
        passwordHash
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
        env.db.put(`user:${user.token}:event:${slug}`, new Date().toISOString()),
    ]));

    return renderPartial(createdEvent, { view, headers });
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
    return renderFull(createEvent);
}