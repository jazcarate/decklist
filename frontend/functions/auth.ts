export interface User {
    admin: boolean,
    token: string,
}

const AUTH_PREFIX = "Bearer ";

export async function getUser(request: Request, db: KVNamespace): Promise<User | "Unauthorized" | "Forbidden"> {
    const auth = request.headers.get("Authorization");
    if (!auth)
        return "Unauthorized";

    if (!auth.startsWith(AUTH_PREFIX))
        return "Unauthorized";

    const token = auth.substring(AUTH_PREFIX.length);
    const user = await db.get(`token:${token}`);
    if (!user)
        return "Forbidden";

    return { ...JSON.parse(user), token };
}