export default () => ({
  port: Number.parseInt(process.env.PORT as string, 10) || 3000,
  database: {
    url: process.env.DB_URL ?? 
    `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?schema=public`,
    host: process.env.DB_HOST,
    port: Number.parseInt(process.env.DB_PORT as string, 10) || 5432,
    user: process.env.DB_USERNAME,
    pass: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
  },
  security: {
    corsOrigin: process.env.CORS_ORIGIN,
    rateLimit: {
      ttl: Number.parseInt(process.env.RATE_LIMIT_TTL as string, 10),
      limit: Number.parseInt(process.env.RATE_LIMIT_LIMIT as string, 10),
    }
  },
  jwt: {
    access_token: process.env.JWT_ACCESS_SECRET,
    access_expires: process.env.JWT_ACCESS_EXPIRES,
    refresh_token: process.env.JWT_REFRESH_SECRET,
    refresh_expires: process.env.JWT_REFRESH_EXPIRES,
  }
});