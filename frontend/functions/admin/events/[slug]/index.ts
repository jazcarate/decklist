import { pbkdf2 } from "../../../auth";
import { renderPartial } from "../../../render";
import row from "../../../../templates/admin/events/eventRow.html";
import eventInfo from "../../../../templates/admin/events/eventInfo.html";

interface Env {
    db: KVNamespace,
    content: R2Bucket,
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

    const password = form.get("password") as string | null;
    const newSlug = form.get("slug") as string;
    const name = form.get("name") as string;

    const oldEventKey = `events:${slug}`;
    let { passwordHash } = JSON.parse(await env.db.get(oldEventKey));
    if (password)
        passwordHash = await pbkdf2(password);

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


    await env.db.put(`events:${newSlug}`, JSON.stringify({ passwordHash }), { metadata: { name } });

    return renderPartial(row, { view: { name, slug: newSlug } });
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
    const slug = params.slug as string;

    const entries = await env.db.list({ prefix: `event:${slug}:entry:` });

    return renderPartial(eventInfo, { view: { size: entries.keys.length } });
}