export interface Foo {
  id: string;
  name: string;
  description: string | null;
  status: FooStatus;
  priority: number;
  isActive: boolean;
  metadata: Record<string, any>;
  config: object;
  tags: string[];
  score: number;
  largeText: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum FooStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  PENDING = "pending",
  ARCHIVED = "archived",
}

function randomString(length: number) {
  return Math.random().toString(36).substring(2, 2 + length);
}

function randomEnum<T extends object>(anEnum: T): T[keyof T] {
  const values = Object.values(anEnum) as T[keyof T][];
  return values[Math.floor(Math.random() * values.length)];
}

function randomDate() {
  return new Date(Date.now() - Math.floor(Math.random() * 1000000000));
}

export function randomFoo(): Foo {
  return {
    id: crypto.randomUUID(),
    name: randomString(8),
    description: Math.random() > 0.5 ? randomString(20) : null,
    status: randomEnum(FooStatus),
    priority: Math.floor(Math.random() * 10),
    isActive: Math.random() > 0.5,
    metadata: { foo: randomString(5), bar: Math.random() },
    config: { setting: randomString(4) },
    tags: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, () => randomString(4)),
    score: parseFloat((Math.random() * 100).toFixed(2)),
    largeText: randomString(100),
    createdAt: randomDate(),
    updatedAt: randomDate(),
  };
}