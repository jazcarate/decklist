import { renderFull } from "./render";
import index from "../templates/index.html";

export const onRequestGet: PagesFunction = async ({ env, request }) => {
    return renderFull(index);
}
