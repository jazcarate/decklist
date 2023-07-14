import { renderFull, renderPartial } from "../../render";
import listUsers from "../../../templates/admin/users/index.html";
import userResult from "../../../templates/admin/users/users.html";
import row from "../../../templates/admin/users/userRow.html";

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
        const [_user, token, _event, slug] = key.name.split(":")
        return [token, slug] as [string, string];
    }).filter(([token, slug]) => {
        return (qtoken != null && token.includes(qtoken)) || (qevent != null && slug.includes(qevent));
    }))
    const grouped = Object.entries(users).map(([token, events]) => ({ token, events }));

    const isHtmx = Boolean(request.headers.get("HX-Request"));
    let response: Response;
    if (isHtmx)
        response = renderPartial(userResult, { users: grouped, qtoken, qevent }, { row });
    else
        response = renderFull(listUsers, { users: grouped, qtoken, qevent }, { row, users: userResult });

    response.headers.set("HX-Replace-Url", url.href);
    return response;
}