import { CDC } from "./cdc";

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

// Bar with CDC metadata for analytical pipelines
export interface BarWithCDC extends Bar, CDC {}


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