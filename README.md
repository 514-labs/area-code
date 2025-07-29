<img width="1074" height="120" alt="Area Code starter repo powered by Moose — Automated setup with Turborepo" src="https://github.com/user-attachments/assets/a860328a-cb75-41a2-ade4-b9a0624918e0" />

# Starter Applications

Area Code is a starter repo with all the necessary building blocks for a production ready repository that can be used to build multi-modal applications.

There are two sample applications: [User Facing Analytics](/UFA) and [Operational Data Warehouse](/odw/). Quickstarts for each of those projects live in the readme of their respective folders ([UFA](/UFA/README.md), [ODW](/odw/README.md)).

## User Facing Analytics

The UFA monorepo is a starter kit for building applications with a multi-modal backend that combines transactional (PostgreSQL), analytical (ClickHouse), and search (Elasticsearch) capabilities. The stack is configured for real-time data synchronization across services.

### UFA Stack:
Backend & Data:
* Transactional: PostgreSQL | Fastify | Drizzle ORM
* Analytical: ClickHouse | Moose (API & Ingest)
* Search: Elasticsearch

Sync & Streaming: Moose Workflows (with Temporal) | Moose Stream (with Redpanda) | Supabase Realtime 
Frontend: Vite | React 19 | TypeScript | TanStack (Router, Query, Form) | Tailwind CSS


## Operational Data Warehouse

The odw project is a starter kit for an operational data warehouse, using the Moose framework to ingest data from various sources (Blobs, Events, Logs) into an analytical backend (ClickHouse).

### ODW Stack:
Backend & Data:
* Framework: Moose (Python)
* Data Platform: ClickHouse (Warehouse) | RedPanda (Streaming)
* Ingestion: Moose connectors for Blobs, Events, and Logs

Frontend: Streamlit






