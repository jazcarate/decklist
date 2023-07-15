import { renderFull, renderPartial } from "../../render";
import listEvents from "../../../templates/admin/events/index.html";

interface Env {
    db: KVNamespace
}

interface Metadata {
    name: string,
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q");

    const prefix = "events:";
    const dbEvents = await env.db.list<Metadata>({ prefix });

    const events = dbEvents.keys.map(event => ({
        name: event.metadata.name,
        slug: event.name.substring(prefix.length)
    })).filter(({ name, slug }) => {
        if (q == null) return true;
        return name.includes(q) || slug.includes(q);
    });

    let response = renderFull(listEvents, { q, events, title: `Admin events` });
    response.headers.set("HX-Push-Url", url.href);
    return response;
}