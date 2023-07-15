import { renderFull, renderPartial } from "../../render";
import list from "../../../templates/events/list.html";

interface Env {
    db: KVNamespace,
    ALL_ADMIN: boolean,
    SIGNING_SECRET: string,
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { params } = context;
    const slug = params.slug as string;

    return renderFull(list, { title: slug, slug });
}