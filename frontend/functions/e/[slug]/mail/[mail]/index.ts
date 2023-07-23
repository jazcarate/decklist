import sanitizeHtml from 'sanitize-html';

import { renderFull, renderPartial } from "../../../../render";
import mailTemplate from "../../../../../templates/events/mail.html";

interface Env {
    db: KVNamespace
    content: R2Bucket
}

interface MailMetadata {
    from: string;
    name?: string;
    subject: string;
    note?: string;
    date: number
    reviewed: boolean;
}

interface AttachmentMetadata {
    safe: boolean,
    problem?: string
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
    const slug = params.slug as string;
    const id = params.mail as string;
    const url = new URL(request.url);

    const mail = await env.db.getWithMetadata<MailMetadata>(`event:${slug}:mails:${id}`);

    if (!mail.metadata) return new Response("Email not found", { status: 404 });

    const prefix = `event:${slug}:mail:${id}:attachments:`;
    const contents = await env.content.list({ prefix });
    const metadata = await env.db.list<AttachmentMetadata>({ prefix });

    let attachments = [];
    let refreshable: boolean = false
    for (const obj of contents.objects) {
        const status = metadata.keys.find(({ name }) => name == obj.key);
        let safe: boolean, problem: string;
        if (status && status.metadata) {
            safe = status.metadata.safe;
            problem = status.metadata.problem;
        } else {
            safe = false;
            problem = "Not yet scanned";
            refreshable = true;
        }
        const idx = obj.key.substring(prefix.length);
        const link = `${url.protocol}//${url.host}/e/${slug}/mail/${id}/${idx}`;

        const object = await env.content.get(obj.key)
        const type = object.httpMetadata?.contentType;

        let fileName: string
        const matchName = object.httpMetadata?.contentType?.match(/filename=".+"/)
        if (matchName)
            fileName = matchName[0];
        else
            fileName = "no.name";

        let extra: { text?: string; html?: string; img?: boolean, object?: string, fileName?: string; };

        if (type) {
            if (type == "text/plain") {
                extra = { text: await object.text() }
            } else if (type == "text/html") {
                const html = sanitizeHtml(await object.text());
                extra = { html };
            } else if (type.startsWith("image/")) {
                extra = { img: true };
            } else if (type == "application/pdf" || type == "application/x-pdf") {
                extra = { object: type }
            }
        }
        attachments.push({ idx, link, safe, problem, fileName, refreshable, ...extra });
    }

    return renderFull(mailTemplate, { ...mail?.metadata, title: mail?.metadata?.from, attachments, slug, id });
}


export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
    const slug = params.slug as string;
    const id = params.mail as string;
    const form = await request.formData();
    const reviewed = form.get("reviewed");
    const note = form.get("note");

    const key = `event:${slug}:mails:${id}`;

    const mail = await env.db.getWithMetadata<MailMetadata>(key);
    if (!mail.metadata) return new Response("Email not found", { status: 404 });

    await env.db.put(key, mail.value, {
        metadata: {
            ...mail.metadata,
            reviewed, note
        }
    });

    return new Response("", { status: 204, statusText: "No Content" });
}