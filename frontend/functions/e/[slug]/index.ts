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
    subject: string;
    name: string;
    note?: string;
    date: number;
    reviewed: boolean;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, params, env }) => {
    const url = new URL(request.url);
    const slug = params.slug as string;
    const q = url.searchParams.get("q");

    const prefix = `event:${slug}:mails:`;
    const event = await env.db.getWithMetadata<EventMetadata>(`events:${slug}`);
    const mails = (await env.db.list<MailMetadata>({ prefix })).keys
        .sort(mail => mail.metadata.date)
        .map(mail => {
            const id = mail.name.substring(prefix.length);
            return { ...mail.metadata, id, };
        })
        .filter(({ from, name, note, subject }) => {
            console.log({ from, name, note, q });
            if (q == null) return true;
            return from?.toLowerCase()?.includes(q) ||
                name?.toLowerCase()?.includes(q) ||
                subject?.toLowerCase()?.includes(q) ||
                note?.toLowerCase()?.includes(q)
        });

    return renderFull(list, { title: slug, slug, name: event.metadata.name, secret: event.value, mails, q });
}