import createEvent from "../../templates/events/create.html";
import createdEvent from "../../templates/events/created.html";

import { User } from "../auth";
import { renderFull } from "../render";
import generate from "../random-dictionary";

interface Env {
    db: KVNamespace,
    SIGNING_SECRET: string,
    ALL_ADMIN?: boolean
}

export const onRequestPost: PagesFunction<Env> = async ({ env, data, request, waitUntil }) => {
    const json = await request.formData();
    const name = json.get("name");
    let slug = json.get("slug");

    const view = { title: "New event", slug, name };

    let user = data.user as User | null;

    if (!slug)
        return renderFull(createEvent, { ...view, validated: true });

    slug = slug.toLowerCase();
    const emailSuffix = "@decklist.fun";
    if (slug.endsWith(emailSuffix)) {
        slug = slug.substring(0, emailSuffix.length);
    }

    const existingEvent = await env.db.get(`events:${slug}`);
    if (existingEvent != null) {
        return renderFull(createEvent, { ...view, slugExists: true, validated: true });
    }

    const secret = generate();

    waitUntil(Promise.all([
        env.db.put(`events:${slug}`, secret, { metadata: { name } }),
        env.db.put(`user:${slug}:${user.token}`, new Date().toISOString()),
    ]));

    const url = new URL(request.url);
    const manageLink = `${url.protocol}//${url.host}/e/${slug}/login?p=${secret}`;
    return renderFull(createdEvent, { ...view, slug, manageLink, secret });
}

export const onRequestGet: PagesFunction<Env> = async () => {
    return renderFull(createEvent, { title: "Create a new event" });
}