import { Key } from "@514labs/moose-lib";
import { type Foo } from "./foo";
import { type Bar } from "./bar";

// Base event interface - Moose compliant
export interface BaseEvent {
  id: Key<string>; // Moose-compliant primary key
  type: string;
  timestamp: Date;
  source: string;
  correlationId?: string;
  metadata?: {
    user?: string;
    session?: string;
  };
}

// FooThing event parameters - Moose compliant
export interface FooThingParams {
  fooId: string;
  action: "created" | "updated" | "deleted" | "activated" | "deactivated";
  previousData: Foo; // Use existing Foo model
  currentData: Foo;  // Use existing Foo model
  changes: string[]; // List of changed fields
}

// BarThing event parameters - Moose compliant
export interface BarThingParams {
  barId: string;
  fooId: string; // Related foo ID
  action: "created" | "updated" | "deleted" | "enabled" | "disabled";
  previousData: Bar; // Use existing Bar model
  currentData: Bar;  // Use existing Bar model
  changes: string[]; // List of changed fields
  value?: number; // Specific to bar operations
}

// FooThing event interface (extends base event) - Moose compliant
export interface FooThingEvent extends BaseEvent {
  type: "foo.thing";
  params: FooThingParams;
}

// BarThing event interface (extends base event) - Moose compliant
export interface BarThingEvent extends BaseEvent {
  type: "bar.thing";
  params: BarThingParams;
}

// Union type for all event types
export type Event = FooThingEvent | BarThingEvent;

// Event factory functions for easier creation
export const createFooThingEvent = (
  params: FooThingParams,
  overrides?: Partial<Omit<FooThingEvent, "type" | "params">>
): FooThingEvent => ({
  id: crypto.randomUUID(),
  type: "foo.thing",
  timestamp: new Date(),
  source: "system",
  params,
  ...overrides,
});

export const createBarThingEvent = (
  params: BarThingParams,
  overrides?: Partial<Omit<BarThingEvent, "type" | "params">>
): BarThingEvent => ({
  id: crypto.randomUUID(),
  type: "bar.thing",
  timestamp: new Date(),
  source: "system",
  params,
  ...overrides,
});

// Event type guards
export const isFooThingEvent = (event: Event): event is FooThingEvent => {
  return event.type === "foo.thing";
};

export const isBarThingEvent = (event: Event): event is BarThingEvent => {
  return event.type === "bar.thing";
}; 