// Bar data model interfaces
export interface Bar {
  id: string;
  fooId: string;
  value: number;
  label: string | null;
  notes: string | null;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for creating new bar (without generated fields)
export interface CreateBar {
  fooId: string;
  value: number;
  label?: string | null;
  notes?: string | null;
  isEnabled?: boolean;
}

// Interface for updating bar (all fields optional except id)
export interface UpdateBar {
  id: string;
  fooId?: string;
  value?: number;
  label?: string | null;
  notes?: string | null;
  isEnabled?: boolean;
  updatedAt?: Date;
} 