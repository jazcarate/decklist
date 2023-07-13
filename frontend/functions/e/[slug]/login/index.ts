import { renderFull } from "../../../render";
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
    const secret = new URL(request.url).searchParams.get("p");

    if (!user.admin) {
        const auth = await env.db.get(`user:${user.token}:event:${params.slug}`);
        if (!auth && !secret)
            return renderFull(login, { title: `Login to ${slug}`, slug });
    }

    await env.db.put(`user:${user.token}:event:${slug}`, new Date().toISOString());

    const url = new URL(request.url);
    const headers = new Headers([
        ["Location", `${url.protocol}//${url.host}/e/${slug}`]
    ]);

    return new Response("", {
        headers, status: 307, statusText: "Temporary Redirect"
    });
}