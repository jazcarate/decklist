import { renderFull, renderPartial } from "../../../render";
import details from "../../../../templates/admin/events/details/index.html";
import event from "../../../../templates/admin/events/details/event.html";
import attachment from "../../../../templates/admin/events/details/attachment.html";

interface Env {
    db: KVNamespace,
    content: R2Bucket,
}

interface Metadata {
    name: string,
}

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
    const slug = params.slug as string;

    const entries = await env.db.list({ prefix: `event:${slug}:entry:` });
    const deleteEntries = entries.keys.map(e => env.db.delete(e.name));

    const attachments = (await Promise.all(entries.keys
        .map(e => e.name.split(`event:${slug}:entry:`, 1)[1])
        .map(id => env.content.list({ prefix: `attachment:${id}:` }))
    )).flatMap(objs => objs.objects);
    const deleteAttachments = attachments.map(attachment => env.content.delete(attachment.key));

    await Promise.all([
        env.db.delete(`events:${slug}`),
        ...deleteEntries,
        ...deleteAttachments
    ]);
    console.log(`Deleting event ${slug} (${entries.keys.length} entries, ${attachments.length} attachments)...`);

    return new Response("", { status: 200, statusText: "Ok" });
}

export const onRequestPut: PagesFunction<Env> = async ({ env, params, request }) => {
    const form = await request.formData();
    const slug = params.slug as string;

    const newSecret = form.get("secret") as string | null;
    const newSlug = form.get("slug") as string;
    const name = form.get("name") as string;
    const size = form.get("size") as string | null;

    const oldEventKey = `events:${slug}`;
    let { secret } = JSON.parse(await env.db.get(oldEventKey));

    if (slug !== newSlug) {
        console.log(`Migration ${slug} to ${newSlug}`);
        await env.db.delete(oldEventKey);
        const prefix = `event:${slug}:entry:`;
        const entries = await env.db.list({ prefix })
        for (const entry of entries.keys) {
            const key = entry.name.substring(prefix.length);
            const value = await env.db.get(entry.name);
            await env.db.put(`event:${newSlug}:entry:${key}`, value);
            await env.db.delete(key);

            console.log(` - Entry ${key}`);
        }
    }

    await env.db.put(`events:${newSlug}`, JSON.stringify({ secret: newSecret ?? secret }), { metadata: { name } });

    const response = renderPartial(event, { name, size: String(size), slug: newSlug, secret: newSecret });
    response.headers.append("HX-Push", request.url.replaceAll(slug, newSlug));
    return response;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
    const slug = params.slug as string;

    const dbEvent = await env.db.getWithMetadata<Metadata>(`events:${slug}`);
    const { secret } = JSON.parse(dbEvent.value);
    const { name } = dbEvent.metadata;
    const attachments = (await env.db.list({ prefix: `event:${slug}:entry:` })).keys;

    return renderFull(details, { attachments, secret, name, slug }, { event, attachment });
}