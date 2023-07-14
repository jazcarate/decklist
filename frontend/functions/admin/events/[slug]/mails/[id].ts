import mail from "../../../../../templates/admin/events/details/mail.html";
import { renderPartial } from "../../../../render";

interface Env {
    db: KVNamespace,
    content: R2Bucket,
}

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
    const slug = params.slug as string;
    const id = params.id as string;

    const key = `event:${slug}:mail:${id}`;
    await env.db.delete(key);

    const content = await env.content.list({ prefix: `${key}:` });
    for (const mail of content.objects) {
        await env.content.delete(mail.key);
    }

    console.log(`Deleted mail ev${slug}-em${id} (${content.objects.length} mails contents)...`);

    return new Response("", { status: 200, statusText: "Ok" });
}

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
    const slug = params.slug as string;
    const id = params.id as string;

    const form = await request.formData();
    const from = form.get("from");
    const name = form.get("name");
    const note = form.get("note");
    const reviewed = Boolean(form.get("reviewed"));

    const key = `event:${slug}:mail:${id}`;
    const oldMail = await env.db.getWithMetadata(key);

    const { from: oldFrom, name: oldName, note: oldNote, reviewed: oldReviewed } = oldMail.metadata as any;

    const newMail = {
        note: note ?? oldNote,
        from: from ?? oldFrom,
        name: name ?? oldName,
        reviewed: reviewed ?? oldReviewed
    }

    await env.db.put(key, oldMail.value, { metadata: newMail });

    return renderPartial(mail, { ...newMail, slug, id });
}