import { User } from "../../auth";
import { renderFull } from "../../render";
import login from "../../../templates/events/login.html";

interface Env {
    db: KVNamespace,
}

export const onRequest: PagesFunction<Env> = async ({ params, env, data, next, request }) => {
    const user = data.user as User | null;
    const slug = params.slug as string;
    const inputSecret = new URL(request.url).searchParams.get("p");

    if (user.admin)
        return next();

    const auth = await env.db.get(`user:${slug}:${user.token}`);
    if (auth)
        return next();

    if (!inputSecret)
        return renderFull(login, { title: `Login to ${slug}`, slug })

    const secret = await env.db.get(`events:${slug}`);
    if (inputSecret != secret)
        return renderFull(login, { title: `Login to ${slug}`, slug, forbidden: true });

    await env.db.put(`user:${slug}:${user.token}`, new Date().toISOString());
    const response = await next();
    const url = new URL(request.url);
    url.searchParams.delete("p");
    response.headers.set("HX-Replace-Url", url.href);
    return response;
}