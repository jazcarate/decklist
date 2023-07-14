import { renderFull, renderPartial } from "../../../render";
import details from "../../../../templates/admin/events/details/index.html";
import event from "../../../../templates/admin/events/details/event.html";
import mail from "../../../../templates/admin/events/details/mail.html";

interface Env {
    db: KVNamespace,
    content: R2Bucket,
}

interface Metadata {
    name: string,
}

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
    const slug = params.slug as string;

    const prefix = `event:${slug}:mail:`;
    const mails = await env.db.list({ prefix });

    await env.db.delete(`events:${slug}`)

    for (const mail of mails.keys) {
        await env.db.delete(mail.name);
    }

    const mailsContents = await env.content.list({ prefix });
    for (const obj of mailsContents.objects) {
        await env.content.delete(obj.key)
    }

    console.log(`Deleted event ${slug} (${mails.keys.length} mails, ${mailsContents.objects.length} contents)...`);

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
        const prefix = `event:${slug}:mail:`;
        const entries = await env.db.list({ prefix })
        for (const entry of entries.keys) {
            const key = entry.name.substring(prefix.length);
            const value = await env.db.get(entry.name);
            await env.db.delete(key);
            await env.db.put(`event:${newSlug}:mail:${key}`, value);

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
    const prefix = `event:${slug}:mail:`;
    const mails = (await env.db.list<any>({ prefix })).keys
        .map(attachment => ({
            ...attachment.metadata,
            id: attachment.name.substring(prefix.length),
        }));

    return renderFull(details, { mails, secret, name, slug }, { event, mail });
}