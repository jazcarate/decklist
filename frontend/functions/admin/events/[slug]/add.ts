import { renderPartial } from "../../../render";
import adminMail from "../../../../templates/partials/adminMail.html";

interface Env {
    db: KVNamespace,
    content: R2Bucket,
}

function randId() {
    var arr = new Uint8Array(3)
    crypto.getRandomValues(arr)
    return Array.from(arr, v => v.toString(16).padStart(2, "0")).join('')
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
    const form = await request.formData();
    const slug = params.slug as string;

    // TODO: Duplicated from Email worker
    const id = randId();
    const from = form.get("from");
    const name = form.get("mailName");
    const subject = form.get("subject");
    const safe = form.get("safe") ?? false;
    const date = Date.now();
    const metadata = { from, name, subject, reviewed: false, date };

    await env.db.put(`event:${slug}:mails:${id}`,
        "", { metadata });

    const bodyKey = `event:${slug}:mail:${id}:attachments:`;
    const attachments = form.getAll("attachments") as unknown as File[];
    await Promise.all(attachments.map(async (attachment, idx) => {
        const key = bodyKey + String(idx + 1);
        await env.content.put(key, await attachment.arrayBuffer(), {
            httpMetadata: {
                contentType: attachment.type, contentDisposition: `inline; filename="${attachment.name}"`
            }
        });
        await env.db.put(key, "", { metadata: { safe: Boolean(safe) } });
    }));

    return renderPartial(adminMail, { from, name, subject, slug, id, safe });
}