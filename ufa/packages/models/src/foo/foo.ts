import { CDC } from "../cdc";

// Status enum for PostgreSQL enum type
export enum FooStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  PENDING = "pending",
  ARCHIVED = "archived",
}

// Foo data model interfaces
export interface Foo {
  id: string; // UUID in PostgreSQL
  name: string; // TEXT/VARCHAR
  description: string | null; // TEXT (nullable)
  status: FooStatus; // ENUM
  priority: number; // INTEGER
  is_active: boolean; // BOOLEAN
  metadata: Record<string, any>; // JSONB
  tags: string[]; // TEXT[] (array type)
  score: number; // DECIMAL/NUMERIC
  large_text: string; // TEXT (for large content)
  created_at: Date; // TIMESTAMP
  updated_at: Date; // TIMESTAMP
}

// Foo with CDC metadata for analytical pipelines
export type FooWithCDC = Foo & CDC;

// Interface for creating new foo (omit generated/auto fields)
export interface CreateFoo extends Pick<Foo, "name"> {
  description?: string | null;
  status?: FooStatus;
  priority?: number;
  is_active?: boolean;
  metadata?: Record<string, any>;
  tags?: string[];
  score?: number;
  large_text?: string;
}

// Interface for updating foo (all fields optional except id)
export interface UpdateFoo extends Partial<Omit<Foo, "id" | "created_at">> {
  id: string;
  updated_at?: Date;
}
