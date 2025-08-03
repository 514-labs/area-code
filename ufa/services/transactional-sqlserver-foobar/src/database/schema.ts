// Simple type definitions for SQL Server database structure
// Tables are created by seed-sqlserver.py script

export interface DbFoo {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: number;
  is_active: boolean;
  metadata: string; // JSON string in SQL Server
  tags: string; // JSON array as string in SQL Server
  score: string; // SQL Server DECIMAL comes as string
  large_text: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DbBar {
  id: string;
  foo_id: string; // Foreign key to foo table
  value: number; // INT in the seed script
  label: string | null;
  notes: string | null;
  is_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export type NewDbFoo = Omit<DbFoo, 'id' | 'created_at' | 'updated_at'>;
export type NewDbBar = Omit<DbBar, 'id' | 'created_at' | 'updated_at'>;

// Note: Tables are created by seed-sqlserver.py script
// No DDL or triggers needed as they're already handled by the seed script
