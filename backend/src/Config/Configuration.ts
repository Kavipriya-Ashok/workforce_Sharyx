export default () => ({
  Port: process.env.PORT || 8000,
  Database: {
    Host: process.env.DB_HOST,
    Port: 5432,
    User: process.env.DB_USER,
    Password: process.env.DB_PASS,
    Name: process.env.DB_NAME,
    Seed: process.env.DB_SEED,
    Sync: process.env.DB_SYNC == "true",
    LOG: process.env.DB_LOG == "true",
  },
  Encryption: {
    SecertKey: process.env.SECERT_KEY,
  },
  JWT: {
    SecertToken: process.env.TOKEN_SECRET,
    ExpiresIn: process.env.ExpiresIn,
  },
  InfluxDB: {
    INFLUX_URL: process.env.INFLUX_URL,
    INFLUX_TOKEN: process.env.INFLUX_TOKEN,
    INFLUX_ORG: process.env.INFLUX_ORG,
    INFLUX_BUCKET: process.env.INFLUX_BUCKET,
    INFLUX_DB: process.env.INFLUX_DB,
  },
  AuditLog: {
    Enable: process.env.AUDIT_LOG == "true",
  },
  FileStoragePath: process.env.STORAGE_PATH || "/uploads",
});
