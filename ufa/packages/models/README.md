# @workspace/models

Shared data models and event types for the area-code workspace.

## Overview

This package provides TypeScript interfaces and types for the core data models used across the application:

- **Foo**: Primary entity model
- **Bar**: Secondary entity model with foo relationship
- **Events**: Shared event system with FooThing and BarThing extensions

## Installation

This package is private to the workspace and is installed via:

```bash
pnpm add @workspace/models
```

## Usage

### Import specific models

```typescript
import { Foo, CreateFoo } from "@workspace/models";
```

### Import everything

```typescript
import { Foo, Bar } from "@workspace/models";
```

## Models

### Foo Model

The primary entity with the following properties:

- `id`: UUID primary key
- `name`: Required string
- `description`: Optional text
- `status`: Status string (active, inactive, pending, archived)
- `priority`: Integer priority
- `isActive`: Boolean flag
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

#### Interfaces

```typescript
interface Foo {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateFoo {
  name: string;
  description?: string;
  status?: string;
  priority?: number;
  isActive?: boolean;
}

interface UpdateFoo {
  id: string;
  name?: string;
  description?: string;
  status?: string;
  priority?: number;
  isActive?: boolean;
  updatedAt?: Date;
}
```

### Bar Model

Secondary entity related to Foo:

- `id`: UUID primary key
- `fooId`: UUID foreign key to Foo
- `value`: Required integer
- `label`: Optional string
- `notes`: Optional text
- `isEnabled`: Boolean flag
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

#### Interfaces

```typescript
interface Bar {
  id: string;
  fooId: string;
  value: number;
  label?: string;
  notes?: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateBar {
  fooId: string;
  value: number;
  label?: string;
  notes?: string;
  isEnabled?: boolean;
}

interface UpdateBar {
  id: string;
  fooId?: string;
  value?: number;
  label?: string;
  notes?: string;
  isEnabled?: boolean;
  updatedAt?: Date;
}
```

## Events

### Base Event Structure

All events extend the base event interface:

```typescript
interface BaseEvent {
  id: string; // UUID
  type: string; // Event type
  timestamp: Date; // When the event occurred
  source: string; // Event source
  correlationId?: string; // Optional correlation ID
  metadata?: Record<string, unknown>; // Optional metadata
}
```

### FooThing Events

Events related to Foo operations:

```typescript
interface FooThingEvent extends BaseEvent {
  type: "foo.thing";
  params: {
    fooId: string;
    action: "created" | "updated" | "deleted" | "activated" | "deactivated";
    previousData?: any;
    currentData?: any;
    changes?: string[];
  };
}
```

### BarThing Events

Events related to Bar operations:

```typescript
interface BarThingEvent extends BaseEvent {
  type: "bar.thing";
  params: {
    barId: string;
    fooId: string;
    action: "created" | "updated" | "deleted" | "enabled" | "disabled";
    previousData?: any;
    currentData?: any;
    changes?: string[];
    value?: number;
  };
}
```

### Event Factory Functions

Use the factory functions for easier event creation:

```typescript
import { createFooThingEvent, createBarThingEvent } from "@workspace/models";

const fooEvent = createFooThingEvent({
  fooId: "123e4567-e89b-12d3-a456-426614174000",
  action: "created",
  currentData: {
    /* foo data */
  },
});

const barEvent = createBarThingEvent({
  barId: "123e4567-e89b-12d3-a456-426614174001",
  fooId: "123e4567-e89b-12d3-a456-426614174000",
  action: "updated",
  value: 42,
});
```

## Type Safety

All models are plain TypeScript interfaces providing compile-time type safety:

```typescript
import { Foo, CreateFoo } from "@workspace/models";

// Type-safe foo creation
const newFoo: CreateFoo = {
  name: "Example Foo",
  description: "This is an example",
  priority: 5,
};

// Type-safe foo usage
const processFoo = (foo: Foo) => {
  console.log(foo.name); // TypeScript knows this is a string
  console.log(foo.id); // TypeScript knows this is a string
};
```

## Type Guards

Event type guards are provided for runtime type checking:

```typescript
import { isFooThingEvent, isBarThingEvent } from "@workspace/models";

if (isFooThingEvent(event)) {
  // TypeScript now knows this is a FooThingEvent
  console.log(event.params.fooId);
}
```
