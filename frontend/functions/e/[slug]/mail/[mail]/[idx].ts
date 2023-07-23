interface Env {
    content: R2Bucket
}
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
    const slug = params.slug as string;
    const mail = params.mail as string;
    const idx = params.idx as string;

    const object = await env.content.get(`event:${slug}:mail:${mail}:attachments:${idx}`);
    if (!object) {
        return new Response("Not Found", { status: 404, statusText: "Not Found" });
    }

    const headers = new Headers();
    headers.set("Content-Security-Policy", "sandbox;");
    object.writeHttpMetadata(headers)

    return new Response(object.body, {
        headers,
        status: 200
    });
}