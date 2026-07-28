export default {
    protocol: process.env.WUD_PROTOCOL || 'http',
    host: process.env.WUD_HOST || 'localhost',
    port: process.env.WUD_PORT || 3000,
    username: process.env.WUD_USERNAME || 'john',
    password: process.env.WUD_PASSWORD || 'doe',
};
