import { renderFull } from "../../render";
import listEvents from "../../../templates/admin/events/index.html";
import row from "../../../templates/admin/events/eventRow.html";

interface Env {
    db: KVNamespace
}

interface Metadata {
    name: string,
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
    const prefix = "events:";
    const dbEvents = await env.db.list<Metadata>({ prefix });

    const events = dbEvents.keys.map(event => ({
        name: event.metadata.name,
        slug: event.name.substring(prefix.length)
    }))

    return renderFull(listEvents, { view: { events }, partials: { row } });
}