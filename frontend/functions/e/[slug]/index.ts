import { renderFull, renderPartial } from "../../render";
import list from "../../../templates/events/list.html";

interface Env {
    db: KVNamespace,
}

interface Metadata {
    from: string;
    name: string;
    note?: string;
    reviewed: boolean;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, params, env }) => {
    const url = new URL(request.url);
    const slug = params.slug as string;
    const q = url.searchParams.get("q");

    const prefix = `event:${slug}:mail:`;
    const mails = (await env.db.list<Metadata>({ prefix })).keys
        .map(mail => {
            const { from, name, note, reviewed } = mail.metadata;
            const id = mail.name.substring(prefix.length);
            return { from, name, note, reviewed, id };
        })
        .filter(({ from, name, note }) => {
            if (q == null) return true;
            return from?.includes(q) || name.includes(q) || note?.includes(q)
        });

    const response = renderFull(list, { title: slug, slug, mails, q });
    response.headers.set("HX-Push-Url", url.href);
    return response
}