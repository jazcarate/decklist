import { Entry } from "@decklist/api";

interface Env {
    db: KVNamespace
    content: R2Bucket
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
    const entry = params.entry as string;

    const attachmentsObjs = await env.content.list({ prefix: `attachment:${entry}:` });
    const attachmentsBodies = await Promise.all(
        attachmentsObjs.objects.map(obj => env.content.get(obj.key))
    );
    const attachments = await Promise.all(
        attachmentsBodies.map(body => body.text())
    )

    const entriesText = await Promise.all(entriesKey.keys.map(entry => env.db.get(entry.name)));
    const entries = entriesText.map(t => JSON.parse(t) as Entry);

    return Response.json({
        attachments
    });
}
