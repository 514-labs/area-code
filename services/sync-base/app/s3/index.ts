import { Task, Workflow } from "@514labs/moose-lib";
import { createConnector, ConnectorType } from "../utilities";

export const s3Task = new Task<null, void>("s3-sync-task", {
    run: async () => {
        const connector = createConnector(ConnectorType.S3);
        await connector.extract();
    }
});

export const s3workflow = new Workflow("s3-sync-workflow", {
    startingTask: s3Task,
});