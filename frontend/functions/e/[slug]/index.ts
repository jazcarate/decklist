import { renderFull, renderPartial } from "../../render";
import list from "../../../templates/events/list.html";
import login from "../../../templates/events/login.html";
import { AUTH_COOKIE, User, pbkdf2Verify, sign } from "../../auth";
import { serialize } from "cookie";

interface Env {
    db: KVNamespace,
    ALL_ADMIN: boolean,
    SIGNING_SECRET: string,
}

const ONE_MONTH = 2678400;

export const onRequestGet: PagesFunction<Env> = async ({ env, params, data }) => {
    const user = data.user as User | null;
    const slug = params.slug as string;

    if (!user)
        return renderFull(login, { title: `Login to ${slug}`, slug });

    const auth = await env.db.get(`user:${user.token}:event:${params.slug}`);
    if (!auth)
        return renderFull(login, { title: `Login to ${slug}`, slug });

    return renderFull(list, { slug, title: slug });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params, waitUntil, data }) => {
    const input = await request.formData();
    let user = data.user as User | null;

    const password = input.get("password") as string;
    const slug = params.slug as string;

    const view = { slug }

    if (!password)
        return renderPartial(login, { ...view, validated: true });

    if (user == null) {
        user = {
            token: crypto.randomUUID(),
            admin: env.ALL_ADMIN
        }
    }

    const event = JSON.parse(await env.db.get(`events:${slug}`));

    if (!event)
        return renderPartial(login, { ...view, forbidden: true });

    if (!await pbkdf2Verify(event.passwordHash, password)) {
        waitUntil(env.db.delete(`user:${user.token}:event:${slug}`));
        return renderPartial(login, { ...view, forbidden: true });
    }

    waitUntil(env.db.put(`user:${user.token}:event:${slug}`, new Date().toISOString()));

    const jwtCookie = await sign({ exp: Date.now() + ONE_MONTH, ...user }, env.SIGNING_SECRET);
    const newAuthCookie = serialize(AUTH_COOKIE, jwtCookie, {
        httpOnly: true,
        sameSite: true,
        secure: true,
        maxAge: ONE_MONTH
    });
    let headers = new Headers([["Set-Cookie", newAuthCookie]]);

    return renderPartial(list, { slug, title: slug }, headers);
}
