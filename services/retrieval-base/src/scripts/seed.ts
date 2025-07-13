import { type Foo, type Bar, FooStatus } from "@workspace/models";
import { bulkIndex } from "../services/search";

// Sample data for testing
const sampleFoos: Foo[] = [
  {
    id: "foo-1",
    name: "First Foo Item",
    description:
      "This is a detailed description of the first foo item for testing search functionality",
    status: FooStatus.ACTIVE,
    priority: 1,
    isActive: true,
    metadata: { category: "general", type: "task" },
    tags: ["urgent", "development"],
    score: 0,
    largeText:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "foo-2",
    name: "Second Foo Task",
    description: "Another foo with different keywords to test search relevance",
    status: FooStatus.PENDING,
    priority: 2,
    isActive: true,
    metadata: { category: "testing", type: "task" },
    tags: ["search", "relevance"],
    score: 0,
    largeText:
      "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra. Vestibulum erat wisi, condimentum sed, commodo vitae, ornare sit amet, wisi.",
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-02"),
  },
  {
    id: "foo-3",
    name: "Inactive Foo",
    description: null,
    status: FooStatus.INACTIVE,
    priority: 3,
    isActive: false,
    metadata: {},
    tags: [],
    score: 0,
    largeText:
      "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.",
    createdAt: new Date("2024-01-03"),
    updatedAt: new Date("2024-01-03"),
  },
  {
    id: "foo-4",
    name: "Archived Foo Project",
    description: "This foo has been archived but is still searchable",
    status: FooStatus.ARCHIVED,
    priority: 4,
    isActive: false,
    metadata: { category: "project", type: "archived" },
    tags: ["archived", "searchable"],
    score: 0,
    largeText:
      "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.",
    createdAt: new Date("2024-01-04"),
    updatedAt: new Date("2024-01-04"),
  },
  {
    id: "foo-5",
    name: "High Priority Foo",
    description: "Urgent foo task that needs immediate attention",
    status: FooStatus.ACTIVE,
    priority: 1,
    isActive: true,
    metadata: { category: "urgent", type: "task" },
    tags: ["high-priority", "urgent", "attention"],
    score: 0,
    largeText:
      "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus.",
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-05"),
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
