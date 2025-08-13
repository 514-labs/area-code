import { CDC } from "../cdc";
import { Foo } from "../foo";

// Bar data model interfaces
export interface Bar {
  id: string;
  foo_id: string;
  value: number;
  label: string | null;
  notes: string | null;
  is_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export type BarWithFoo = Bar & {
  foo: Foo;
};

// Bar with CDC metadata for analytical pipelines
export type BarWithCDC = Bar & CDC;

// Interface for creating new bar (without generated fields)
export interface CreateBar {
  foo_id: string;
  value: number;
  label?: string | null;
  notes?: string | null;
  is_enabled?: boolean;
}

// Interface for updating bar (all fields optional except id)
export interface UpdateBar {
  id: string;
  foo_id?: string;
  value?: number;
  label?: string | null;
  notes?: string | null;
  is_enabled?: boolean;
  updated_at?: Date;
}

// Anonymous bar data for unauthenticated users
export const anonymousBar: CreateBar = {
  foo_id: "demo-foo-id", // This will need to be set to an actual foo ID at runtime
  value: 100,
  label: "Anonymous Demo Bar",
  notes:
    "This is a demo bar created by an anonymous user to test CDC functionality",
  is_enabled: true,
};
