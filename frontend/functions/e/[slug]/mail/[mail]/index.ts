import { renderPartial } from "../../../../render";
import mailTemplate from "../../../../../templates/events/mail.html";

interface Env {
    db: KVNamespace
    content: R2Bucket
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
    const slug = params.slug as string;
    const mail = params.mail as string;
    const url = new URL(request.url);

    const prefix = `event:${slug}:mail:${mail}:attachments:`;
    const mails = await env.content.list({ prefix });

    const attachments = mails.objects.map(obj => {
        const idx = obj.key.substring(prefix.length);
        const link = `${url.protocol}//${url.host}/e/${slug}/mail/${mail}/${idx}`;
        return { link };
    });

    return renderPartial(mailTemplate, { attachments, slug });
}
