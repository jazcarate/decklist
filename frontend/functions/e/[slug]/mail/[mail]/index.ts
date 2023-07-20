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

    let attachments = [];
    for (const obj of mails.objects) {
        const status = await env.db.getWithMetadata<any>(obj.key);
        let safe, problem: string;
        if (!status.metadata) {
            safe = false;
            problem = "Not yet scanned"
        } else {
            safe = status.metadata.safe;
            problem = status.metadata.problem;
        }
        const idx = obj.key.substring(prefix.length);
        const link = `${url.protocol}//${url.host}/e/${slug}/mail/${mail}/${idx}`;
        attachments.push({ link, safe, problem });
    }

    return renderPartial(mailTemplate, { attachments, slug });
}
