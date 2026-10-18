declare const _default: () => {
    Port: string | number;
    Database: {
        Host: string;
        Port: string | number;
        User: string;
        Password: string;
        Name: string;
        Seed: string;
        Sync: true;
        LOG: boolean;
    };
    Encryption: {
        SecertKey: string;
    };
    JWT: {
        SecertToken: string;
        ExpiresIn: string;
    };
    InfluxDB: {
        INFLUX_URL: string;
        INFLUX_TOKEN: string;
        INFLUX_ORG: string;
        INFLUX_BUCKET: string;
        INFLUX_DB: string;
    };
    AuditLog: {
        Enable: boolean;
    };
    FileStoragePath: string;
};
export default _default;
