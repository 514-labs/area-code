import { S3Connector, S3ConnectorConfig } from "./s3connector";

export enum ConnectorType {
    S3 = "S3",
}

// Add unions for future connector types
export type Connector<T> = S3Connector<T>;

type ConnectorConfigMap = {
    [ConnectorType.S3]: S3ConnectorConfig;
};

export function createConnector<T>(type: ConnectorType.S3, config?: S3ConnectorConfig): S3Connector<T>;
export function createConnector<T>(
    type: ConnectorType,
    config?: ConnectorConfigMap[typeof type]
): Connector<T> {
    switch (type) {
        case ConnectorType.S3:
            return new S3Connector<T>(config || {});
        default:
            throw new Error(`Unknown connector type: ${type}`);
    }
}