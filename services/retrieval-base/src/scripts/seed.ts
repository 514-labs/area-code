import type { CreateFoo, Bar } from "@workspace/models";
import FooStatus from "@workspace/models";
import { bulkIndex } from "../services/search";

// Sample data for testing
const sampleFoos: CreateFoo[] = [
  {
    name: "First Foo Item",
    description:
      "This is a detailed description of the first foo item for testing search functionality",
    status: FooStatus.ACTIVE,
    priority: 1,
    isActive: true,
  },
  {
    name: "Second Foo Task",
    description: "Another foo with different keywords to test search relevance",
    status: FooStatus.PENDING,
    priority: 2,
    isActive: true,
  },
  {
    name: "Inactive Foo",
    description: null,
    status: FooStatus.INACTIVE,
    priority: 3,
    isActive: false,
  },
  {
    name: "Archived Foo Project",
    description: "This foo has been archived but is still searchable",
    status: FooStatus.ARCHIVED,
    priority: 4,
    isActive: false,
  },
  {
    name: "High Priority Foo",
    description: "Urgent foo task that needs immediate attention",
    status: FooStatus.ACTIVE,
    priority: 1,
    isActive: true,
  },
];

const sampleBars: Bar[] = [
  {
    id: "bar-1",
    fooId: "foo-1",
    value: 100.5,
    label: "Initial Bar Entry",
    notes:
      "This bar is associated with the first foo and contains important notes",
    isEnabled: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "bar-2",
    fooId: "foo-1",
    value: 200.75,
    label: "Secondary Bar",
    notes: null,
    isEnabled: true,
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-02"),
  },
  {
    id: "bar-3",
    fooId: "foo-2",
    value: 50.0,
    label: null,
    notes: "Bar with minimal information for testing",
    isEnabled: false,
    createdAt: new Date("2024-01-03"),
    updatedAt: new Date("2024-01-03"),
  },
  {
    id: "bar-4",
    fooId: "foo-3",
    value: 300.25,
    label: "High Value Bar",
    notes: "This bar has a high numeric value for testing sorting",
    isEnabled: true,
    createdAt: new Date("2024-01-04"),
    updatedAt: new Date("2024-01-04"),
  },
  {
    id: "bar-5",
    fooId: "foo-4",
    value: 15.5,
    label: "Low Value Bar",
    notes: "Bar with low value to test range queries",
    isEnabled: true,
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-05"),
  },
];

async function seed() {
  console.log("🌱 Seeding Elasticsearch with sample data...");

  try {
    // Bulk index all documents
    await bulkIndex(sampleFoos, sampleBars);

    console.log(`✅ Indexed ${sampleFoos.length} foo documents`);
    console.log(`✅ Indexed ${sampleBars.length} bar documents`);
    console.log("🎉 Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }
}

// Run the seeding
seed();
