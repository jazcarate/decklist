import { renderFull } from "../../render";
import listUsers from "../../../templates/admin/users/index.html";
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

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
    const tokensKeys = (await env.db.list({ prefix: "user:" })).keys;
    const users = groupBy(tokensKeys.map(key => {
        const [_user, token, _event, slug] = key.name.split(":")
        return [token, slug] as [string, string];
    }));
    const grouped = Object.entries(users).map(([token, events]) => ({ token, events }));

    return renderFull(listUsers, { users: grouped }, { row });
}