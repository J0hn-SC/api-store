export interface JwtPayload {
    sub: string;
    email?: string;
    iat?: number;
    exp?: number;
}

export interface JwtRefreshPayload {
    sub: string;
    sid: string;
    email?: string;
    iat?: number;
    exp?: number;
}  