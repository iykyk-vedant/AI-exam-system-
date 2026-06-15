const envConfig = require("./config/env");

module.exports = {
  development: {
    client: 'pg',
    connection: {
      connectionString: envConfig.database.url,
      ssl: { rejectUnauthorized: false }
    },
    migrations: {
      directory: './db_migrations'
    }
  },
  production: {
    client: 'pg',
    connection: {
      connectionString: envConfig.database.url,
      ssl: { rejectUnauthorized: false }
    },
    migrations: {
      directory: './db_migrations'
    }
  }
};
