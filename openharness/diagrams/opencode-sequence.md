# OpenCode Sequence

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant CLI as Product CLI
    participant CR as Configuration Resolver
    participant HA as OpenCode Adapter
    participant OC as OpenCode
    participant PR as Selected Provider

    U->>CLI: run opencode --provider P --model M
    CLI->>CR: Resolve preset/profile/overrides
    CR-->>CLI: Provider, model, auth reference, policy
    CLI->>HA: Build LaunchPlan
    HA->>HA: Generate process-scoped inline provider config
    HA-->>CLI: Redacted plan
    CLI->>OC: Spawn with inline config environment
    OC->>PR: Compatible provider request
    PR-->>OC: Response/stream
    OC-->>U: Agent output
    OC-->>CLI: Exit
    CLI->>CLI: Cleanup and optional config verification
```

Expected product effects:

- no write to normal OpenCode provider config;
- no plaintext key written to disk;
- saved profile may contain only the key environment-variable name.
