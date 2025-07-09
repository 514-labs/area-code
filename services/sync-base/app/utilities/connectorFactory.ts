import { S3Connector } from "./s3connector";

export enum ConnectorType {
    S3 = "S3",
}

// Add unions for future connector types
export type Connector = S3Connector;

export function createConnector(type: ConnectorType): Connector {
    switch (type) {
        case ConnectorType.S3:
            return new S3Connector();
        default:
            throw new Error(`Unknown connector type: ${type}`);
    }
}