import createEvent from "../../templates/events/create.html";
import createdEvent from "../../templates/events/created.html";

import { User } from "../auth";
import { renderFull, renderPartial } from "../render";
import generate from "../random-dictionary";

interface Env {
    db: KVNamespace,
    SIGNING_SECRET: string,
    ALL_ADMIN?: boolean
}

export const onRequestPost: PagesFunction<Env> = async ({ env, data, request, waitUntil }) => {
    const json = await request.formData();
    const name = json.get("name");
    const slug = json.get("slug");

    const view = { title: "New event", slug, name };

    let user = data.user as User | null;

    if (!slug)
        return renderPartial(createEvent, { ...view, validated: true });

    const existingEvent = await env.db.get(`events:${slug}`);
    if (existingEvent != null) {
        return renderPartial(createEvent, { ...view, slugExists: true, validated: true });
    }

    const secret = generate();
    const event = {
        secret
    };

    waitUntil(Promise.all([
        env.db.put(`events:${slug}`, JSON.stringify(event), { metadata: { name } }),
        env.db.put(`user:${user.token}:event:${slug}`, new Date().toISOString()),
    ]));

    const url = new URL(request.url);
    const manageLink = `${url.protocol}//${url.host}/e/${slug}/login?p=${secret}`;
    return renderPartial(createdEvent, { ...view, manageLink, secret });
}

export const onRequestGet: PagesFunction<Env> = async () => {
    return renderFull(createEvent);
}