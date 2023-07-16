import { renderFull, renderPartial } from "../../render";
import list from "../../../templates/events/list.html";

interface Env {
    db: KVNamespace,
}

interface EventMetadata {
    name?: string
}

interface MailMetadata {
    from: string;
    name: string;
    note?: string;
    reviewed: boolean;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, params, env }) => {
    const url = new URL(request.url);
    const slug = params.slug as string;
    const q = url.searchParams.get("q");

    const prefix = `event:${slug}:mails:`;
    const event = await env.db.getWithMetadata<EventMetadata>(`events:${slug}`);
    const mails = (await env.db.list<MailMetadata>({ prefix })).keys
        .map(mail => {
            const { from, name, note, reviewed } = mail.metadata;
            const id = mail.name.substring(prefix.length);
            return { from, name, note, reviewed, id };
        })
        .filter(({ from, name, note }) => {
            console.log({ from, name, note, q });
            if (q == null) return true;
            return from?.toLowerCase()?.includes(q) ||
                name?.toLowerCase()?.includes(q) ||
                note?.toLowerCase()?.includes(q)
        });

    return renderFull(list, { title: slug, slug, name: event.metadata.name, secret: event.value, mails, q });
}