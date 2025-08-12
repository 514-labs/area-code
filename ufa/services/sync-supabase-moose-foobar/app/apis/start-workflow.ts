import { ConsumptionApi } from "@514labs/moose-lib";
 

 
interface WorkflowResponse {
  workflowId: string;
  status: string;
}
 
const triggerApi = new ConsumptionApi<{}, WorkflowResponse>(
  "trigger-workflow",
  async (_, { client }) => {
    // Trigger the workflow with input parameters
    const workflowExecution = await client.workflow.execute("supabase-listener", {}); 
 
    return {
      workflowId: workflowExecution.body,
      status: "started"
    };
  }
);
 
export default triggerApi;