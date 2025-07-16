// Example usage of the @workspace/models package
import { 
  createFooThingEvent, 
  createBarThingEvent,
  type FooThingEvent,
  type BarThingEvent,
  type Foo,
  type Bar,
  FooStatus
} from "@workspace/models";

// Example usage of event creation
export function createSampleEvents() {
  // Sample foo data
  const sampleFoo: Foo = {
    id: "foo-123",
    name: "Sample Foo Item",
    description: "This is a sample foo item",
    status: FooStatus.ACTIVE,
    priority: 1,
    is_active: true,
    metadata: {},
    tags: [],
    score: 85.5,
    large_text: "Sample large text content",
    created_at: new Date(),
    updated_at: new Date()
  };

  // Sample bar data
  const sampleBar: Bar = {
    id: "bar-456",
    foo_id: "foo-123",
    value: 42,
    label: "Sample Bar Item",
    notes: "This is a sample bar item",
    is_enabled: true,
    created_at: new Date(),
    updated_at: new Date()
  };

  // Create FooThing event
  const fooEvent: FooThingEvent = createFooThingEvent({
    foo_id: "foo-123",
    action: "created",
    current_data: sampleFoo,
    previous_data: sampleFoo,
    changes: ["name", "status", "priority"]
  });

  // Create BarThing event
  const barEvent: BarThingEvent = createBarThingEvent({
    bar_id: "bar-456",
    foo_id: "foo-123",
    action: "created",
    current_data: sampleBar,
    previous_data: sampleBar,
    changes: ["value", "label"]
  });

  return { fooEvent, barEvent };
}

// Example function to send events to ingestion endpoints
export async function ingestSampleEvents() {
  const { fooEvent, barEvent } = createSampleEvents();

  // Send to Moose ingestion endpoints
  try {
    const fooResponse = await fetch('http://localhost:4000/ingest/FooThingEvent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fooEvent)
    });

    const barResponse = await fetch('http://localhost:4000/ingest/BarThingEvent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(barEvent)
    });

    console.log('Foo event ingested:', fooResponse.ok);
    console.log('Bar event ingested:', barResponse.ok);
  } catch (error) {
    console.error('Error ingesting events:', error);
  }
} 