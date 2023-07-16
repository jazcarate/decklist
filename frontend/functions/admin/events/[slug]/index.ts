import { renderFull, renderPartial } from "../../../render";
import details from "../../../../templates/admin/events/details.html";

interface Env {
    db: KVNamespace,
    content: R2Bucket,
}

interface EventMetadata {
    name: string,
}

interface MailMetadata {
    name: string,
}

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
    const slug = params.slug as string;

    const prefix = `event:${slug}:mails:`;
    const mails = await env.db.list({ prefix });

    await env.db.delete(`events:${slug}`)

    for (const mail of mails.keys) {
        await env.db.delete(mail.name);
    }

    const attachmentPrefix = `event:${slug}:mail:`;
    const mailsContents = await env.content.list({ prefix });
    for (const obj of mailsContents.objects) {
        await env.content.delete(obj.key)
    }

    console.log(`Deleted event ${slug} (${mails.keys.length} mails, ${mailsContents.objects.length} contents)...`);

    return new Response("", { status: 200, statusText: "Ok" });
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
    const form = await request.formData();
    const slug = params.slug as string;

    const newSecret = form.get("secret") as string | null;
    const newSlug = form.get("slug") as string | null;
    const newName = form.get("name") as string | null;

    const oldEventKey = `events:${slug}`;
    let oldDbEvent = await env.db.getWithMetadata<EventMetadata>(oldEventKey);

    let name = newName ?? oldDbEvent.metadata.name;
    const secret = newSecret ?? oldDbEvent.value;

    const mailsPrefix = `event:${slug}:mails:`;
    const dbMails = await env.db.list<MailMetadata>({ prefix: mailsPrefix })
    let mails = dbMails.keys
        .map(mail => ({
            ...mail.metadata,
            id: mail.name.substring(mailsPrefix.length),
        }));

    if (slug !== newSlug) {
        name = `${name} (ex ${slug})`;
        console.log(`Migration ${slug} to ${newSlug}`);
        await env.db.delete(oldEventKey);
        for (const mail of dbMails.keys) {
            const newMailKey = mail.name.replace(slug, newSlug);

            const oldMail = await env.db.getWithMetadata(mail.name);
            await env.db.delete(mail.name);
            await env.db.put(newMailKey, oldMail.value, { metadata: oldMail.metadata });

            console.log(` - Mail ${newMailKey}`);

            const attachmentPrefix = `event:${slug}:mails:`;
            const objects = (await env.content.list({ prefix: attachmentPrefix })).objects;
            for (const objRef of objects) {
                const obj = await env.content.get(objRef.key);
                const newObjKey = obj.key.replace(slug, newSlug);
                await env.content.put(newObjKey, await obj.arrayBuffer(), { ...obj });
                await env.content.delete(objRef.key);

                console.log(` - Object ${newObjKey}`);
            }

            const userPrefix = `user:${slug}:`;
            const users = await env.db.list({ prefix: userPrefix });
            for (const user of users.keys) {
                const newUserKey = user.name.replace(slug, newSlug);
                const oldUser = await env.db.get(user.name);
                await env.db.delete(user.name);
                await env.db.put(newUserKey, oldUser);

                console.log(` - User ${newUserKey}`);
            }
        }
    }

    await env.db.put(`events:${newSlug}`, secret, {
        metadata: { name }
    });

    const response = renderFull(details, { mails, name, slug: newSlug ?? slug, secret });
    if (newSlug) {
        response.headers.append("HX-Replace-Url", request.url.replaceAll(slug, newSlug));
    }
    return response;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
    const slug = params.slug as string;

    const dbEvent = await env.db.getWithMetadata<EventMetadata>(`events:${slug}`);
    if (!dbEvent.value)
        return new Response(`No event ${slug}`, { status: 404, statusText: "Not Found" });

    const secret = dbEvent.value;
    const { name } = dbEvent.metadata;
    const prefix = `event:${slug}:mails:`;
    const mails = (await env.db.list<any>({ prefix })).keys
        .map(mail => ({
            ...mail.metadata,
            id: mail.name.substring(prefix.length),
        }));

    return renderFull(details, { mails, secret, name, slug, title: `Admin ${slug}` });
}