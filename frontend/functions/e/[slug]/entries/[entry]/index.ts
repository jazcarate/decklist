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

    return Response.json({
        attachments
    });
}
