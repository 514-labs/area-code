import { Connection, Request, TYPES } from "tedious";
import { ConnectionConfiguration } from "tedious";
import { config as dotenvConfig } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in parent directory
dotenvConfig({ path: path.resolve(__dirname, "../../.env") });

// SQL Server connection configuration
const config: ConnectionConfiguration = {
  server: process.env.SQLSERVER_HOST || "localhost",
  authentication: {
    type: "default",
    options: {
      userName: process.env.SQLSERVER_USER || "sa",
      password: process.env.SQLSERVER_PASSWORD || "Password!",
    },
  },
  options: {
    database: process.env.SQLSERVER_DATABASE || "sqlCDC",
    port: parseInt(process.env.SQLSERVER_PORT || "1433"),
    trustServerCertificate: true,
    encrypt: false,
    connectTimeout: 10000, // 10 seconds timeout
    requestTimeout: 10000, // 10 seconds timeout for requests
  },
};

// Create connection pool (simple implementation)
class ConnectionPool {
  private connections: Connection[] = [];
  private maxConnections = 10;

  async getConnection(): Promise<Connection> {
    // Try to find an idle connection
    const idleConnection = this.connections.find(
      (conn) => conn.state && (conn.state as any).name === "LoggedIn"
    );

    if (idleConnection) {
      return idleConnection;
    }

    // Create new connection if pool is not full
    if (this.connections.length < this.maxConnections) {
      return this.createConnection();
    }

    // Wait for a connection to become available
    return new Promise((resolve, reject) => {
      const checkForConnection = () => {
        const availableConn = this.connections.find(
          (conn) => conn.state && (conn.state as any).name === "LoggedIn"
        );
        if (availableConn) {
          resolve(availableConn);
        } else {
          setTimeout(checkForConnection, 100);
        }
      };
      checkForConnection();
    });
  }

  private createConnection(): Promise<Connection> {
    return new Promise((resolve, reject) => {
      const connection = new Connection(config);
      
      connection.on("connect", (err) => {
        if (err) {
          console.error("Connection failed:", err);
          reject(err);
        } else {
          console.log("Connected to SQL Server");
          this.connections.push(connection);
          resolve(connection);
        }
      });

      connection.on("error", (err) => {
        console.error("Connection error:", err);
        // Remove failed connection from pool
        const index = this.connections.indexOf(connection);
        if (index > -1) {
          this.connections.splice(index, 1);
        }
      });

      connection.connect();
    });
  }

  async closeAll(): Promise<void> {
    const closePromises = this.connections.map((conn) => {
      return new Promise<void>((resolve) => {
        conn.on("end", () => resolve());
        conn.close();
      });
    });

    await Promise.all(closePromises);
    this.connections = [];
  }
}

// Export connection pool instance
export const connectionPool = new ConnectionPool();

// Helper function to execute SQL queries
export function executeQuery<T = any>(
  query: string,
  params: { [key: string]: any } = {}
): Promise<T[]> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("🔍 SQL Query being executed:", query);
      console.log("🔍 SQL Parameters:", params);
      
      const connection = await connectionPool.getConnection();
      const results: T[] = [];

      const request = new Request(query, (err, rowCount) => {
        if (err) {
          console.error("❌ Query execution error - FULL DETAILS:", err);
          console.error("❌ SQL Error message:", err.message);
          console.error("❌ SQL Error number:", (err as any).number);
          console.error("❌ SQL Error state:", (err as any).state);
          console.error("❌ SQL Error class:", (err as any).class);
          console.error("❌ SQL Error lineNumber:", (err as any).lineNumber);
          console.error("❌ SQL Error serverName:", (err as any).serverName);
          console.error("❌ SQL Error procName:", (err as any).procName);
          reject(err);
        } else {
          console.log("✅ Query executed successfully. Row count:", rowCount);
          console.log("✅ Results returned:", results.length, "rows");
          resolve(results);
        }
      });

      // Add parameters to request
      Object.entries(params).forEach(([key, value]) => {
        const tediousType = getTediousType(value);
        console.log(`🔍 Adding parameter: ${key} = ${value} (type: ${tediousType})`);
        // Ensure parameter name doesn't have @ prefix when adding (Tedious handles this)
        const paramName = key.startsWith('@') ? key.substring(1) : key;
        request.addParameter(paramName, tediousType, value);
      });

      request.on("row", (columns: any[]) => {
        const row: any = {};
        columns.forEach((column: any) => {
          row[column.metadata.colName] = column.value;
        });
        console.log("📄 Row received:", row);
        results.push(row);
      });

      connection.execSql(request);
    } catch (error) {
      console.error("❌ executeQuery catch block error:", error);
      reject(error);
    }
  });
}

// Helper function to determine tedious data type
function getTediousType(value: any): any {
  if (typeof value === "string") {
    return TYPES.NVarChar;
  } else if (typeof value === "number") {
    return Number.isInteger(value) ? TYPES.Int : TYPES.Float;
  } else if (typeof value === "boolean") {
    return TYPES.Bit;
  } else if (value instanceof Date) {
    return TYPES.DateTime;
  } else if (value === null || value === undefined) {
    return TYPES.NVarChar;
  } else {
    return TYPES.NVarChar; // Default to string
  }
}

// Connection pool will be initialized on first use
console.log("📦 SQL Server connection pool ready for on-demand connections");
