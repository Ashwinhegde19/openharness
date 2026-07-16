# System Context Diagram

```mermaid
flowchart LR
    U[Developer] -->|CLI command| C[Product CLI]
    C --> R[Configuration Resolver]
    R --> H[Harness Adapter]
    R --> P[Provider Registry and Policy]
    R --> M[Model and Compatibility Evaluator]
    H --> S[Session Manager]
    S --> O[OpenCode]
    S --> A[Claude Code]
    S --> X[Codex CLI]
    O -->|Direct compatible request| V[Selected Provider]
    A -->|Anthropic Messages| L[Loopback Translation Proxy]
    X -->|OpenAI Responses| L
    L -->|Normalized OpenAI Chat| V
    S --> T[Temporary Session Resources]
    S --> D[(Non-secret Session Metadata)]
    V --> O
    V --> L
    L --> A
    L --> X
```

## Trust boundaries

```mermaid
flowchart TB
    subgraph LocalMachine[User machine]
      CLI[Product CLI]
      HARNESS[Coding harness]
      PROXY[Loopback proxy]
      STORE[(Non-secret profile/session store)]
      TMP[Secure temporary resources]
    end
    subgraph Destination[Selected provider boundary]
      PROVIDER[Local or external provider]
    end
    CLI --> STORE
    CLI --> TMP
    CLI --> HARNESS
    HARNESS --> PROXY
    HARNESS --> PROVIDER
    PROXY --> PROVIDER
```

Key rules:

- provider is explicitly selected;
- secrets are runtime-only by default;
- proxies bind to loopback;
- compatibility is evaluated before launch;
- supported paths preserve persistent harness configuration.
