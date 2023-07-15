import { renderFull, renderPartial } from "../../render";
import login from "../../../templates/events/login.html";
import { User } from "../../auth";

interface Env {
    db: KVNamespace,
}

export const onRequestGet: PagesFunction<Env> = async ({ env, data, request, params }) => {
    const url = new URL(request.url);
    const user = data.user as User;
    const slug = params.slug as string;

    function loginResponse() {
        const headers = new Headers();
        const eventUrl = `${url.protocol}//${url.host}/e/${slug}`;
        if (request.headers.get("HX-Request")) {
            headers.set("HX-Location", eventUrl);
            return new Response("", { status: 200, headers });
        } else {
            headers.set("Location", eventUrl);
            return new Response("", { status: 307, headers });
        }
    }

    if (user.admin) return loginResponse();

    const auth = await env.db.get(`user:${slug}:${user.token}`);
    if (auth) return loginResponse();

    const inputSecret = url.searchParams.get("p");
    const secret = await env.db.get(`events:${slug}`);
    if (inputSecret != secret)
        return renderFull(login, { title: `Login to ${slug}`, slug, forbidden: true });

    return renderFull(login, { title: `Login to ${slug}`, slug });
}