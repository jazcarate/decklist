import { Entry } from "@decklist/api";

interface Env {
    db: KVNamespace
    content: R2Bucket
}

interface Metadata {
    name?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
    const slug = params.slug as string;

    const event = await env.db.getWithMetadata<Metadata>(`events:${slug}`);
    const prefix = `event:${slug}:entry:`;
    const entriesKey = await env.db.list({ prefix });

    const entriesText = await Promise.all(entriesKey.keys.map(entry => env.db.get(entry.name).then(t => [entry.name.substring(prefix.length), t])));
    const entries = entriesText.map(([key, json]) => ({ ...JSON.parse(json), key }));

    return Response.json({
        name: event.metadata.name,
        entries: entries
    });
}
