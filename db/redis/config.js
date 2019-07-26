
module.exports.host = process.env.REDIS_HOST || process.env.REDIS_PORT_6379_TCP_ADDR || 'localhost';
module.exports.port = process.env.REDIS_PORT || process.env.REDIS_PORT_6379_TCP_PORT || 6379;
module.exports.password = process.env.REDIS_PASSWORD || null;
