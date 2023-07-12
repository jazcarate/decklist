import { renderFull, renderPartial } from "../../../render";
import add from "../../../../templates/admin/events/add.html"

interface Env {
    db: KVNamespace,
    content: R2Bucket,
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
    return renderFull(add);
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
    const form = await request.formData();
    const slug = params.slug as string;

    // TODO: Duplicated from Email worker
    const entry = {
        from: form.get("from"),
        note: form.get("subject") ?? "[No subject]",
        status: 0
    };

    const attachments = form.getAll("attachments") as unknown as File[];

    const id = crypto.randomUUID();
    const key = `event:${slug}:entry:${id}`;
    await env.db.put(key, JSON.stringify(entry));
    await Promise.all(attachments.map(async (attachment: any, idx: number) => {
        const attachmentKey = `attachment:${id}:${idx + 1}`;
        await env.content.put(attachmentKey, attachment.content, {
            httpMetadata: {
                contentType: attachment.mimeType, contentDisposition: `attachment; filename="${attachment.filename}"`
            }
        });
    }));

    console.log(`Created entry ${id} for ${slug} (with ${attachments.length} attachments)`);
    return renderPartial(add, { view: { notice: `Created ${id}` } });
}