# Shared Code Extraction Recommendations

This document outlines recommendations for extracting reusable AI/MCP code across backend services (Supabase vs SQL Server).

## 🎯 Current State Analysis

### Duplicated Code:
1. **Aurora MCP Client** - Nearly identical between services
2. **Moose Location Utils** - Only differs in service name lookup
3. **Anthropic Agent Base** - Similar structure, different tool combinations
4. **Chat Routes** - Identical implementation
5. **AI System Prompt Base** - Shared structure with service-specific content

### Service-Specific Differences:
- **Supabase Service**: Aurora MCP + Supabase MCP tools
- **SQL Server Service**: Aurora MCP tools only
- **Service Discovery**: Different analytical service names to find

## 📦 Recommended Shared Package Structure

### Create: `@workspace/ai-services`

```
ufa/packages/ai-services/
├── package.json
├── src/
│   ├── index.ts
│   ├── mcp/
│   │   ├── aurora-mcp-client.ts      # Base Aurora MCP functionality
│   │   ├── supabase-mcp-client.ts    # Supabase-specific MCP
│   │   └── moose-location-utils.ts   # Generic service discovery
│   ├── agents/
│   │   ├── anthropic-agent.ts        # Base agent factory
│   │   └── ai-system-prompt.ts       # Base prompt template
│   ├── routes/
│   │   └── chat-routes-factory.ts    # Reusable chat routes
│   └── types/
│       └── ai-service-config.ts      # Configuration interfaces
└── tsconfig.json
```

## 🏗️ Implementation Strategy

### 1. Service Configuration Pattern

```typescript
// @workspace/ai-services/src/types/ai-service-config.ts
export interface AIServiceConfig {
  serviceName: string;
  analyticalServiceName: string;
  mcpClients: ('aurora' | 'supabase')[];
  systemPromptTemplate: string;
  environmentPrefix?: string;
}

// Service-specific configs
export const SUPABASE_CONFIG: AIServiceConfig = {
  serviceName: 'transactional-supabase-foobar',
  analyticalServiceName: 'analytical-supabase-moose-foobar',
  mcpClients: ['aurora', 'supabase'],
  systemPromptTemplate: 'supabase-service-prompt',
};

export const SQLSERVER_CONFIG: AIServiceConfig = {
  serviceName: 'transactional-sqlserver-foobar', 
  analyticalServiceName: 'analytical-sqlserver-moose-foobar',
  mcpClients: ['aurora'],
  systemPromptTemplate: 'sqlserver-service-prompt',
};
```

### 2. Generic Aurora MCP Client

```typescript
// @workspace/ai-services/src/mcp/aurora-mcp-client.ts
export class AuroraMCPClient {
  constructor(private config: AIServiceConfig) {}
  
  async bootstrap(): Promise<void> {
    const analyticalServicePath = findAnalyticalMooseServicePath(
      __dirname, 
      this.config.analyticalServiceName
    );
    // ... rest of implementation
  }
}
```

### 3. Agent Factory Pattern

```typescript
// @workspace/ai-services/src/agents/anthropic-agent.ts
export class AnthropicAgentFactory {
  static async createStreamTextOptions(
    messages: UIMessage[],
    config: AIServiceConfig
  ) {
    const tools = await this.getMCPTools(config.mcpClients);
    const prompt = getSystemPrompt(config.systemPromptTemplate);
    
    return {
      model: anthropic("claude-3-5-sonnet-20241022"),
      system: prompt,
      messages: convertToModelMessages(messages),
      tools,
      toolChoice: "auto",
      stopWhen: stepCountIs(25),
    };
  }
}
```

### 4. Reusable Chat Routes

```typescript
// @workspace/ai-services/src/routes/chat-routes-factory.ts
export function createChatRoutes(config: AIServiceConfig) {
  return async function chatRoutes(fastify: FastifyInstance) {
    fastify.get("/chat/status", async (request, reply) => {
      // Generic implementation
    });

    fastify.post("/chat", async (request, reply) => {
      const streamTextOptions = await AnthropicAgentFactory
        .createStreamTextOptions(messages, config);
      // ... rest of implementation
    });
  };
}
```

## 🔄 Migration Strategy

### Phase 1: Create Shared Package
1. Create `@workspace/ai-services` package
2. Extract Aurora MCP client to shared package
3. Create configuration system
4. Update both services to use shared Aurora MCP

### Phase 2: Extract Common Patterns  
1. Move chat routes to shared package
2. Extract Anthropic agent base functionality
3. Create system prompt templating system
4. Update Moose location utils to be generic

### Phase 3: Service-Specific Adapters
1. Create service-specific configuration files
2. Implement adapter pattern for unique requirements
3. Maintain service autonomy while sharing core functionality

## 📁 Service Usage After Migration

### Supabase Service:
```typescript
// src/ai/service-config.ts
export const AI_CONFIG = SUPABASE_CONFIG;

// src/server.ts
import { createChatRoutes, bootstrapMCPClients } from '@workspace/ai-services';
import { AI_CONFIG } from './ai/service-config';

await fastify.register(createChatRoutes(AI_CONFIG), { prefix: '/api' });
await bootstrapMCPClients(AI_CONFIG);
```

### SQL Server Service:
```typescript
// src/ai/service-config.ts  
export const AI_CONFIG = SQLSERVER_CONFIG;

// src/server.ts
import { createChatRoutes, bootstrapMCPClients } from '@workspace/ai-services';
import { AI_CONFIG } from './ai/service-config';

await fastify.register(createChatRoutes(AI_CONFIG), { prefix: '/api' });
await bootstrapMCPClients(AI_CONFIG);
```

## 🎯 Benefits

### Code Reduction:
- **~80% reduction** in AI-related code duplication
- **Single source of truth** for MCP client implementations
- **Consistent behavior** across all services

### Maintainability:
- **Centralized updates** for AI SDK version bumps
- **Unified testing** strategy for AI functionality
- **Easier debugging** with shared implementations

### Extensibility:
- **Easy to add new backend types** (MongoDB, PostgreSQL, etc.)
- **Pluggable MCP clients** for different analytical services
- **Template-based customization** for service-specific needs

## ⚠️ Implementation Notes

### Keep Service-Specific:
- Database connection logic
- Business entity routes (foo, bar)
- Service-specific environment variables
- Unique business logic and validations

### Extract to Shared:
- MCP client management
- AI agent base functionality
- Chat route implementations  
- System prompt templating
- Error handling patterns

This approach maintains the principle of "services can run independently" while eliminating code duplication for AI/MCP functionality.