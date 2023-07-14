interface Env {
    content: R2Bucket
}
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
    const slug = params.slug as string;
    const mail = params.mail as string;
    const idx = params.idx as string;

    const object = await env.content.get(`event:${slug}:mail:${mail}:${idx}`);
    if (!object) {
        return new Response("Not Found", { status: 404, statusText: "Not Found" });
    }

    const headers = new Headers();
    headers.set('etag', object.httpEtag);

    if (object.httpMetadata?.contentDisposition)
        headers.set("Content-Disposition", object.httpMetadata?.contentDisposition);
    if (object.httpMetadata?.contentType)
        headers.set("Content-Type", object.httpMetadata?.contentType);

    console.log(`Serving ev${slug}-em${mail}-i${idx} (${object.size}b size)`);

    return new Response(object.body, {
        headers,
        status: 200
    });
}