import { parse } from "cookie";

export interface User {
    token: string,
    admin: boolean
}

//#region JWT
interface JwtHeader {
    typ?: string
    [key: string]: any
}

interface JwtPayload {
    iss?: string
    exp?: number
    nbf?: number
    iat?: number
    [key: string]: any
}

interface JwtData {
    header: JwtHeader
    payload: JwtPayload
}

const algorithm: SubtleCryptoImportKeyAlgorithm = { name: 'HMAC', hash: { name: 'SHA-256' } };
export const AUTH_COOKIE = "auth";

function base64UrlParse(s: string): Uint8Array {
    return new Uint8Array(Array.prototype.map.call(atob(s.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '')), (c: string) => c.charCodeAt(0)));
}

function base64UrlStringify(a: Uint8Array): string {
    return btoa(String.fromCharCode.apply(0, a)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function str2ia(str: string): Uint8Array {
    return base64UrlParse(btoa(unescape(encodeURIComponent(str))))
}

function decodePayload(raw: string) {
    switch (raw.length % 4) {
        case 0:
            break
        case 2:
            raw += '=='
            break
        case 3:
            raw += '='
            break
        default:
            throw new Error('Illegal base64url string!')
    }

    try {
        return JSON.parse(decodeURIComponent(escape(atob(raw))))
    } catch {
        return null
    }
}

function decode(token: string): JwtData {
    return {
        header: decodePayload(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')) as JwtHeader,
        payload: decodePayload(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')) as JwtPayload
    }
}

export async function verify(token: string | null, secret: string): Promise<JwtPayload | null> {
    if (!token) return null;

    const tokenParts = token.split('.')

    if (tokenParts.length !== 3)
        throw new Error('token must consist of 3 parts')

    const jwt = decode(token);
    const { payload } = jwt;

    if (!payload) return null;
    if (payload.nbf && payload.nbf > Math.floor(Date.now() / 1000)) return null;
    if (payload.exp && payload.exp <= Math.floor(Date.now() / 1000)) return null;

    const key = await crypto.subtle.importKey('raw', str2ia(secret), algorithm, false, ['verify']);

    if (await crypto.subtle.verify(algorithm, key, base64UrlParse(tokenParts[2]), str2ia(`${tokenParts[0]}.${tokenParts[1]}`)))
        return payload;

    return null;
}

export async function sign(payload: JwtPayload, secret: string): Promise<string> {
    const options = { algorithm: 'HS256', header: { typ: 'JWT' } };

    if (!payload.iat)
        payload.iat = Math.floor(Date.now() / 1000);

    if (!payload.iss)
        payload.iss = "decklist.fun";

    const payloadAsJSON = JSON.stringify(payload)
    const partialToken = `${base64UrlStringify(str2ia(JSON.stringify({ ...options.header, alg: options.algorithm })))}.${base64UrlStringify(str2ia(payloadAsJSON))}`

    const key = await crypto.subtle.importKey('raw', str2ia(secret), algorithm, false, ['sign']);
    const signature = await crypto.subtle.sign(algorithm, key, str2ia(partialToken));

    return `${partialToken}.${base64UrlStringify(new Uint8Array(signature))}`
}
//#endregion JWT

export async function getUser(request: Request, signingSecret: string): Promise<User | null> {
    const cookieHeader = request.headers.get("Cookie");
    if (!cookieHeader) return null;

    const cookies = parse(cookieHeader);
    const userJwt = await verify(cookies[AUTH_COOKIE], signingSecret);
    if (!userJwt) return null;

    return {
        token: userJwt.token,
        admin: !!userJwt.admin,
    }
}