import { Entry, Status } from "@decklist/api";

interface Env {
    db: KVNamespace,
    content: R2Bucket,
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request, waitUntil }) => {
    const json = await request.json<any>();
    const slug = params.slug as string;

    if (!slug)
        return new Response("Missing event slug", { status: 400, statusText: "Bad Request" });

    // TODO: Duplicated from Email worker
    const entry: Entry = {
        from: json.from,
        note: json.subject ?? "[No subject]",
        status: Status.Pending
    };
    const id = crypto.randomUUID();
    const key = `event:${slug}:entry:${id}`;
    await env.db.put(key, JSON.stringify(entry));
    await Promise.all(json.attachments.map(async (attachment: any, idx: number) => {
        const attachmentKey = `attachment:${id}:${idx + 1}`;
        await env.content.put(attachmentKey, attachment.content, {
            httpMetadata: {
                contentType: attachment.mimeType, contentDisposition: `attachment; filename="${attachment.filename}"`
            }
        });
    }));

    return new Response(`Created entry ${id} for ${slug} (with ${json.attachments.length} attachments)`, { status: 201, statusText: "Created" });
}