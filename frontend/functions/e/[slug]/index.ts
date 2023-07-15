import { renderFull, renderPartial } from "../../render";
import list from "../../../templates/events/list.html";
import login from "../../../templates/events/login.html";
import { User } from "../../auth";

interface Env {
    db: KVNamespace,
    ALL_ADMIN: boolean,
    SIGNING_SECRET: string,
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { params } = context;
    const slug = params.slug as string;

    if (await isLoggedIn(context))
        return renderFull(list, { title: slug, slug });

    return renderFull(login, { title: `Login to ${slug}`, slug });
}

async function isLoggedIn({ data, params, env, request }: EventContext<Env, any, Record<string, unknown>>): Promise<boolean> {
    const user = data.user as User;
    const slug = params.slug as string;
    if (user.admin)
        return true;

    const auth = await env.db.get(`user:${user.token}:event:${slug}`);
    if (auth)
        return true;

    return false;
}
