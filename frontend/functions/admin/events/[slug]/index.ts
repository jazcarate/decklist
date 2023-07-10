interface Env {
    db: KVNamespace,
    content: R2Bucket,
}

export const onRequestDelete: PagesFunction<Env> = async ({ env, params, waitUntil }) => {
    const slug = params.slug as string;
    if (!slug)
        return new Response("Missing event slug", { status: 400, statusText: "Bad Request" });

    const entries = await env.db.list({ prefix: `event:${slug}:entry:` });
    const deleteEntries = entries.keys.map(e => env.db.delete(e.name));

    const attachments = (await Promise.all(entries.keys
        .map(e => e.name.split(`event:${slug}:entry:`, 1)[1])
        .map(id => env.content.list({ prefix: `attachment:${id}:` }))
    )).flatMap(objs => objs.objects);
    const deleteAttachments = attachments.map(attachment => env.content.delete(attachment.key));

    waitUntil(Promise.all([
        env.db.delete(`events:${slug}`),
        ...deleteEntries,
        ...deleteAttachments
    ]));
    return new Response(`Deleting event ${slug} (${entries.keys.length} entries, ${attachments.length} attachments)...`, { status: 202, statusText: "Accepted" });
}