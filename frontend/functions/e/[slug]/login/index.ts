import { renderFull, renderPartial } from "../../../render";
import login from "../../../../templates/events/login.html";
import { User } from "../../../auth";

interface Env {
    db: KVNamespace,
    ALL_ADMIN: boolean,
    SIGNING_SECRET: string,
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params, data, request }) => {
    const url = new URL(request.url);
    const user = data.user as User;
    const slug = params.slug as string;
    const inputSecret = new URL(request.url).searchParams.get("p");

    async function loggedIn(): Promise<'yes' | 'no' | 'forbidden'> {
        if (!inputSecret)
            return 'no';

        const secret = await env.db.get(`events:${slug}`);
        if (!secret)
            return 'forbidden';

        if (inputSecret != secret)
            return 'forbidden';

        return 'yes';
    }

    const isHtmx = Boolean(request.headers.get("HX-Request"));
    const renderer = isHtmx ? renderPartial : renderFull;

    const isLogged = await loggedIn();
    console.log({ isLogged });

    switch (isLogged) {
        case 'no': return renderer(login, { title: `Login to ${slug}`, slug });
        case 'forbidden': return renderer(login, { title: `Login to ${slug}`, slug, forbidden: true });
        case 'yes':
            await env.db.put(`user:${user.token}:event:${slug}`, new Date().toISOString());

            const location = `${url.protocol}//${url.host}/e/${slug}`;
            if (isHtmx) {
                const headers = new Headers([["HX-Redirect", location]]);
                return new Response("", { status: 204, headers });
            } else {
                const headers = new Headers([["Location", location]]);
                return new Response("", {
                    headers, status: 307, statusText: "Temporary Redirect"
                });
            }
    }
}