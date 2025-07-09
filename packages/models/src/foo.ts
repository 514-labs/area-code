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
  isActive: boolean; // BOOLEAN
  metadata: Record<string, any>; // JSONB
  config: object; // JSON
  tags: string[]; // TEXT[] (array type)
  score: number; // DECIMAL/NUMERIC
  largeText: string; // TEXT (for large content)
  createdAt: Date; // TIMESTAMP
  updatedAt: Date; // TIMESTAMP
}

// Interface for creating new foo (omit generated/auto fields)
export interface CreateFoo extends Pick<Foo, "name"> {
  description?: string | null;
  status?: FooStatus;
  priority?: number;
  isActive?: boolean;
  metadata?: Record<string, any>;
  config?: object;
  tags?: string[];
  score?: number;
  largeText?: string;
}

// Interface for updating foo (all fields optional except id)
export interface UpdateFoo extends Partial<Omit<Foo, "id" | "createdAt">> {
  id: string;
  updatedAt?: Date;
}
