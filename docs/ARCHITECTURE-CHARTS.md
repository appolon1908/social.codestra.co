# social.codestra.co — Architecture Charts

> Repository: `appolon1908/social.codestra.co`  
> Baseline branch: `main`  
> Repository-local visual architecture. Update with code, contracts, ownership and deployment changes.

## 1. System context
```mermaid
flowchart LR
 A["Operators / schedulers"] --> B["Social web/backend/orchestrator"]
 B --> R["social.codestra.co<br/>Social media management platform"]
 R --> S["tenant/post/schedule state"]
 R --> D["social providers via governed adapters"]
```

## 2. Internal component architecture
```mermaid
flowchart TB
 I["Entrypoint / UI / API / CLI"] --> P["Identity, policy, validation"]
 P --> C["Core domain / orchestration"]
 C --> S["State / configuration / persistence"]
 C --> A["Adapters / integrations"]
 A --> X["Approved dependencies"]
 C --> O["Metrics, logs, traces, audit"]
```

## 3. Critical flow
```mermaid
sequenceDiagram
 participant U as Caller
 participant B as social.codestra.co
 participant P as Policy
 participant C as Core
 participant S as State
 participant X as Dependency
 U->>B: Request / event / action
 B->>P: Authenticate + validate
 P-->>B: Decision
 B->>C: Create/schedule content, authorize, publish and reconcile
 C->>S: Read / persist
 C->>X: Bounded integration
 X-->>C: Result / readback
 C-->>U: Normalized response
```

## 4. Deployment and promotion
```mermaid
flowchart LR
 F["Feature branch"] --> T["Tests / validation"]
 T --> PR["Pull request + review"]
 PR --> CI["CI green"]
 CI --> ST["Staging / isolated verification"]
 ST --> EX["Exact-SHA certification"]
 EX --> G{"Production approval?"}
 G -- No --> ST
 G -- Yes --> P["Production promotion"]
 P --> H["Health/readiness + rollback check"]
```

## 5. Observability and recovery
```mermaid
flowchart LR
 R["social.codestra.co"] --> M["Metrics"]
 R --> L["Logs / audit"]
 R --> T["Traces / correlation"]
 M --> O["Observability stack"]
 L --> O
 T --> O
 O --> A["Dashboards / alerts"]
 R --> B["Backup / config snapshot"]
 B --> RR["Restore / rollback rehearsal"]
```

## Ownership notes
- **Role:** Social media management platform
- **Primary boundary:** Social web/backend/orchestrator
- **State/config:** tenant/post/schedule state
- **Dependencies/consumers:** social providers via governed adapters
- Cross-repository effects must use reviewed contracts; production effects remain separately gated.
