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
    })
        .filter(([token, _slug]) => {
            if (qtoken != null)
                return token.includes(qtoken)
            return true;
        })
        .filter(([_token, slug]) => {
            if (qevent != null)
                return slug.includes(qevent)
            return true;
        })
    );

    const grouped = Object.entries(users).map(([token, events]) => ({ token, events }));

    const response = renderFull(listUsers, { users: grouped, qtoken, qevent, title: "Admin users" });
    response.headers.set("HX-Push-Url", url.href);
    return response;
}