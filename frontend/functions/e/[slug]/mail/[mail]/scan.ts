interface Env {
    scan: Fetcher
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params }) => {
    const slug = params.slug as string;
    const mail = params.mail as string;

    const response = await env.scan.fetch(new Request("https://scan.florius.workers.dev/", {
        method: 'POST',
        headers: new Headers([["content-type", 'application/json']]),
        body: JSON.stringify({ slug, mail }),
    }));
    const updated = await response.json<string[] | null>();

    const headers = new Headers()
    if (updated && updated.length > 0)
        headers.append("HX-Refresh", "true");

    return new Response("", { status: 204, statusText: "No Content", headers });
}