import { SupabaseClient } from "@supabase/supabase-js";

export interface DatabaseStatus {
  isConnected: boolean;
  isRealtimeConfigured: boolean;
  error?: string;
}

// private async validateFunctionsWork(): Promise<boolean> {
//   try {
//     console.log("🔍 Testing disable_realtime_replication function...");
//     const disableResult = await this.client.rpc(
//       "disable_realtime_replication"
//     );
//     if (disableResult.error) {
//       console.error(
//         "❌ disable_realtime_replication failed:",
//         disableResult.error
//       );
//       return false;
//     }

//     console.log("🔍 Testing enable_realtime_replication function...");
//     const enableResult = await this.client.rpc("enable_realtime_replication");
//     if (enableResult.error) {
//       console.error(
//         "❌ enable_realtime_replication failed:",
//         enableResult.error
//       );
//       return false;
//     }

//     console.log("✅ Both management functions work correctly");
//     return true;
//   } catch (error) {
//     console.error("❌ Error testing management functions:", error);
//     return false;
//   }
// }

// private async validateManagementFunctionsExist(): Promise<boolean> {
//   try {
//     const checkFunctionsSQL = `
//       SELECT COUNT(*) as function_count
//       FROM pg_proc
//       WHERE proname IN ('disable_realtime_replication', 'enable_realtime_replication')
//       AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
//     `;

//     const result = await this.client.rpc("sql", { query: checkFunctionsSQL });

//     if (result.error) {
//       console.warn(
//         "⚠️ Could not check for management functions:",
//         result.error
//       );
//       return false;
//     }

//     const functionCount = result.data?.[0]?.function_count || 0;
//     console.log(`🔍 Found ${functionCount}/2 management functions`);

//     return functionCount >= 2;
//   } catch (error) {
//     console.warn("⚠️ Error validating management functions:", error);
//     return false;
//   }
// }

// private async createRealtimeManagementFunctions(): Promise<void> {
//   console.log("🔧 Creating realtime management functions...");

//   const functionsSQL = `
//     -- Create helper functions for managing realtime replication (idempotent)
//     CREATE OR REPLACE FUNCTION disable_realtime_replication()
//     RETURNS TEXT AS $$
//     BEGIN
//         -- Drop and recreate empty publication to disable realtime
//         DROP PUBLICATION IF EXISTS supabase_realtime;
//         CREATE PUBLICATION supabase_realtime;

//         RETURN 'Realtime replication disabled - publication emptied';
//     END;
//     $$ LANGUAGE plpgsql SECURITY DEFINER;

//     CREATE OR REPLACE FUNCTION enable_realtime_replication()
//     RETURNS TEXT AS $$
//     BEGIN
//         -- Drop and recreate publication with all tables to enable realtime
//         DROP PUBLICATION IF EXISTS supabase_realtime;
//         CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

//         RETURN 'Realtime replication enabled - publication includes all tables';
//     END;
//     $$ LANGUAGE plpgsql SECURITY DEFINER;
//   `;

//   await this.executeComplexSQL(functionsSQL);
//   console.log("✅ Realtime management functions created and will persist");
// }

// async disableRealtimeReplication(): Promise<void> {
//   console.log("🛑 Disabling realtime replication...");
//   try {
//     // Try stored function first
//     const result = await this.client.rpc("disable_realtime_replication");
//     if (result.error) {
//       throw new Error(result.error.message);
//     }
//     console.log(`✅ ${result.data}`);
//   } catch (error) {
//     // Fallback to direct SQL via executeComplexSQL (more reliable)
//     console.log("🔄 Using direct SQL method...");
//     console.log("   Reason:", error instanceof Error ? error.message : error);
//     await this.executeComplexSQL(`
//       DROP PUBLICATION IF EXISTS supabase_realtime;
//       CREATE PUBLICATION supabase_realtime;
//     `);
//     console.log("✅ Realtime replication disabled via direct SQL");
//   }
// }

// async enableRealtimeReplication(): Promise<void> {
//   console.log("📡 Enabling realtime replication...");
//   try {
//     // Try stored function first
//     const result = await this.client.rpc("enable_realtime_replication");
//     if (result.error) {
//       throw new Error(result.error.message);
//     }
//     console.log(`✅ ${result.data}`);
//   } catch (error) {
//     // Fallback to direct SQL via executeComplexSQL (more reliable)
//     console.log("🔄 Using direct SQL method...");
//     console.log("   Reason:", error instanceof Error ? error.message : error);
//     await this.executeComplexSQL(`
//       DROP PUBLICATION IF EXISTS supabase_realtime;
//       CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
//     `);
//     console.log("✅ Realtime replication enabled via direct SQL");
//   }
// }

// async waitForRealtimeServices(timeoutMs: number = 60000): Promise<boolean> {
//   const startTime = Date.now();
//   const checkInterval = 3000; // Check every 3 seconds
//   const logInterval = 15000; // Log progress every 15 seconds
//   let lastLogTime = 0;

//   console.log("🔄 Waiting for realtime services to be available...");

//   while (Date.now() - startTime < timeoutMs) {
//     try {
//       const isReady = await this.checkRealtimeWebSocket();
//       if (isReady) {
//         console.log("✅ Realtime services are ready");
//         return true;
//       }
//     } catch {
//       // Connection failed, continue waiting
//     }

//     // Only log progress every 15 seconds to reduce spam
//     const currentTime = Date.now();
//     if (currentTime - lastLogTime >= logInterval) {
//       const elapsed = Math.round((currentTime - startTime) / 1000);
//       const timeout = Math.round(timeoutMs / 1000);
//       console.log(
//         `⏳ Still waiting for realtime services... (${elapsed}s/${timeout}s)`
//       );
//       lastLogTime = currentTime;
//     }

//     await new Promise((resolve) => setTimeout(resolve, checkInterval));
//   }

//   console.error(
//     "❌ Timeout waiting for realtime services to become available"
//   );
//   return false;
// }

// async initializeDatabase(): Promise<DatabaseStatus> {
//   const status: DatabaseStatus = {
//     isConnected: false,
//     isRealtimeConfigured: false,
//   };

//   try {
//     // STEP 1: VALIDATE - Check if database connection is needed
//     console.log("🔍 Step 1: Validating database connection...");
//     if (isCliMode()) {
//       console.log("🚀 Development mode: waiting for Supabase database...");
//       status.isConnected = await this.waitForDatabase();
//     } else {
//       console.log("🏭 Production mode: checking database connection...");
//       status.isConnected = await this.checkDatabaseConnection();
//     }

//     if (!status.isConnected) {
//       status.error = "Could not connect to database";
//       return status;
//     }
//     console.log("✅ Step 1 Complete: Database connected");

//     // CRITICAL: Re-enable realtime replication after any previous disable
//     console.log("🔧 Ensuring realtime replication is enabled...");
//     try {
//       await this.enableRealtimeReplication();
//       console.log("✅ Realtime replication enabled");
//     } catch {
//       // This is expected if publication is already FOR ALL TABLES
//       console.log(
//         "ℹ️ Replication management not needed - Supabase handles it"
//       );
//     }

//     // STEP 2: Wait for realtime services to be actually ready
//     console.log("🔄 Step 2: Waiting for realtime services to be ready...");
//     const isRealtimeReady = await this.waitForRealtimeServices();

//     if (!isRealtimeReady) {
//       status.error = "Realtime services did not become ready within timeout";
//       return status;
//     }

//     console.log("✅ Step 2 Complete: Realtime services are ready");
//     status.isRealtimeConfigured = true;

//     console.log("🎯 Database initialization complete");
//     return status;
//   } catch (error) {
//     status.error = `Database initialization error: ${error}`;
//     console.error("❌ Database initialization error:", error);
//     return status;
//   }
// }

// static async createInitialized(): Promise<SupabaseManager> {
//   const manager = new SupabaseManager();

//   console.log("🔧 Initializing Supabase database...");
//   const dbStatus = await manager.initializeDatabase();

//   if (!dbStatus.isConnected) {
//     throw new Error(`Failed to connect to database: ${dbStatus.error}`);
//   }

//   if (!dbStatus.isRealtimeConfigured) {
//     throw new Error(
//       `Failed to configure realtime replication: ${dbStatus.error}`
//     );
//   }

//   console.log("✅ Supabase database initialization completed successfully");
//   return manager;
// }
