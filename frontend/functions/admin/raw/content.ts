interface Env {
    content: R2Bucket,
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
    const allObj = (await env.content.list()).objects.map(o => o.key);
    console.info({ allObj });

    return Response.json(allObj);
}
