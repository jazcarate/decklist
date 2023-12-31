import { User } from "../../../../../auth";

interface Env {
    db: KVNamespace,
}

export const onRequestDelete: PagesFunction<Env> = async ({ env, params, data }) => {
    const token = params.token as string;
    const slug = params.slug as string;
    const user = data.user as User;

    console.log(`audit - ${user.token} :: Deleting user [${token}] permission for [${slug}]`);
    await env.db.delete(`user:${slug}:${token}`);
    return new Response("", { status: 200 });
}