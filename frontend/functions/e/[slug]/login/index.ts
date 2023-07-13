import { renderFull, renderPartial } from "../../../render";
import login from "../../../../templates/events/login.html";
import { User } from "../../../auth";

interface Env {
    db: KVNamespace,
    ALL_ADMIN: boolean,
    SIGNING_SECRET: string,
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params, data, request }) => {
    const user = data.user as User;
    const slug = params.slug as string;
    const inputSecret = new URL(request.url).searchParams.get("p");

    const renderer = Boolean(request.headers.get("HX-Request")) ? renderPartial : renderFull;

    if (!inputSecret)
        return renderer(login, { title: `Login to ${slug}`, slug });

    const event = JSON.parse(await env.db.get(`events:${slug}`));
    if (!event)
        return renderer(login, { title: `Login to ${slug}`, slug, forbidden: true });

    const { secret } = event;
    if (inputSecret != secret)
        return renderer(login, { title: `Login to ${slug}`, slug, forbidden: true });

    await env.db.put(`user:${user.token}:event:${slug}`, new Date().toISOString());

    const url = new URL(request.url);
    const headers = new Headers([
        ["Location", `${url.protocol}//${url.host}/e/${slug}`],
        //TODO when loggin in by HTMX the swap is wrong. Go to an event, put in the correct password. You see two H1
        ["HX-Redirect", `${url.protocol}//${url.host}/e/${slug}`],
    ]);

    return new Response("", {
        headers, status: 307, statusText: "Temporary Redirect"
    });
}