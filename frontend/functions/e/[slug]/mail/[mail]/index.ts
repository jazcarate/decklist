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

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
    const slug = params.slug as string;
    const id = params.mail as string;
    const url = new URL(request.url);

    const mail = await env.db.getWithMetadata<MailMetadata>(`event:${slug}:mails:${id}`);

    if (!mail.metadata) return new Response("Email not found", { status: 404 });

    const prefix = `event:${slug}:mail:${id}:attachments:`;
    const dbAttachments = await env.content.list({ prefix });

    let attachments = [];
    for (const obj of dbAttachments.objects) {
        const status = await env.db.getWithMetadata<any>(obj.key);
        let safe, problem: string;
        if (!status.metadata) {
            safe = false;
            problem = "Not yet scanned"
        } else {
            safe = status.metadata.safe;
            problem = status.metadata.problem;
        }
        const idx = obj.key.substring(prefix.length);
        const link = `${url.protocol}//${url.host}/e/${slug}/mail/${id}/${idx}`;
        attachments.push({ idx, link, safe, problem });
    }

    return renderFull(mailTemplate, { ...mail.metadata, attachments, slug, id });
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

    return renderPartial(mailTemplate, { ...mail.metadata, reviewed, note, slug, id });
}