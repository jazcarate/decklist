import { renderPartial } from "../../../render";
import mail from "../../../../templates/admin/events/details/mail.html"

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
    const note = form.get("subject");
    const date = Date.now();
    const mailData = { from, name: from, note, reviewed: false };

    await env.db.put(`event:${slug}:mail:${id}`,
        JSON.stringify({ date }),
        { metadata: mailData });

    const bodyKey = `event:${slug}:mail:${id}:`;
    const attachments = form.getAll("attachments") as unknown as File[];
    await Promise.all(attachments.map(async (attachment, idx) => {
        await env.content.put(bodyKey + String(idx + 1), await attachment.arrayBuffer(), {
            httpMetadata: {
                contentType: attachment.type, contentDisposition: `inline; filename="${attachment.name}"`
            }
        });
    }));

    return renderPartial(mail, { ...mailData, slug, id });
}