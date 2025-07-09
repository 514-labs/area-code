import { Task, Workflow } from "@514labs/moose-lib";
import { createConnector, ConnectorType } from "../utilities";
import { Foo } from "../utilities/random";

export const s3Task = new Task<null, void>("s3-sync-task", {
    run: async () => {
        const connector = createConnector<Foo>(ConnectorType.S3, { batchSize: 500 });
        const data = await connector.extract();
        console.log(`Extracted ${data.length} items from S3`);
    }
});

export const s3workflow = new Workflow("s3-sync-workflow", {
    startingTask: s3Task,
});