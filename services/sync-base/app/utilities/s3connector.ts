import { randomFoo } from "../utilities/random";

export interface S3ConnectorConfig {
    batchSize?: number;
}

export class S3Connector<T> {
    private batchSize: number;

    constructor(config: S3ConnectorConfig) {
        this.batchSize = config.batchSize || 1000;
    }

    public async extract(): Promise<T[]> {
        console.log("Extracting data from S3");
        const data: T[] = [];
        for (let i = 0; i < this.batchSize; i++) {
            data.push(randomFoo() as T);
        }
        return data;
    }
}