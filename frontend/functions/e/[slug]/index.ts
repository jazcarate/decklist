import { renderFull } from "../../render";
import list from "../../../templates/events/list.html";
import login from "../../../templates/events/login.html";
import { User } from "../../auth";

interface Env {
    db: KVNamespace,
    ALL_ADMIN: boolean,
    SIGNING_SECRET: string,
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params, data, request }) => {
    const user = data.user as User | null;
    const slug = params.slug as string;

    if (!user.admin) {
        const auth = await env.db.get(`user:${user.token}:event:${params.slug}`);
        if (!auth)
            return renderFull(login, { title: `Login to ${slug}`, slug });
    }

    return renderFull(list, { slug, title: slug });
}