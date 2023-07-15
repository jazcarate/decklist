import { renderFull, renderPartial } from "../../render";
import listUsers from "../../../templates/admin/users/index.html";

interface Env {
    db: KVNamespace
}

function groupBy<value>(list: [string, value][]): { [key: string]: value[] } {
    return list.reduce((acc, [key, value]) => {
        acc[key] = acc[key] ?? [];
        acc[key].push(value);
        return acc;
    }, {});
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
    const url = new URL(request.url);
    const qtoken = url.searchParams.get("qtoken");
    const qevent = url.searchParams.get("qevent");

    const tokensKeys = (await env.db.list({ prefix: "user:" })).keys;

    const users = groupBy(tokensKeys.map(key => {
        const [_user, slug, token] = key.name.split(":")
        return [slug, token] as [string, string];
    })
        .filter(([_slug, token]) => {
            if (qtoken != null)
                return token.includes(qtoken)
            return true;
        })
        .filter(([slug, _token]) => {
            if (qevent != null)
                return slug.includes(qevent)
            return true;
        })
    );

    const grouped = Object.entries(users).map(([slug, tokens]) => ({ tokens, slug }));

    const response = renderFull(listUsers, { users: grouped, qtoken, qevent, title: "Admin users" });
    response.headers.set("HX-Push-Url", url.href);
    return response;
}