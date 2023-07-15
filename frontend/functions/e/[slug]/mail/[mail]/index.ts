import { renderPartial } from "../../../../render";
import mailContent from "../../../../../templates/events/mails/index.html";
import content from "../../../../../templates/events/mails/content.html";

interface Env {
    db: KVNamespace
    content: R2Bucket
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
    const slug = params.slug as string;
    const mail = params.mail as string;
    const url = new URL(request.url);

    const prefix = `event:${slug}:mail:${mail}:`;
    const mails = await env.content.list({ prefix });

    const view = mails.objects.map(obj => {
        const idx = obj.key.substring(prefix.length);
        const link = `${url.protocol}//${url.host}/e/${slug}/mail/${mail}/${idx}`;
        const type = obj.httpMetadata?.contentType;
        const name = obj.httpMetadata?.contentDisposition?.match(/filename="(\w+)/)[1] ?? 'inline';
        return { name, link, type };
    });

    return renderPartial(mailContent, view, { content });
}
