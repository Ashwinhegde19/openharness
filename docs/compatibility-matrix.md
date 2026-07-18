# openharness compatibility matrix

> Generated from [compatibility-matrix.json](./compatibility-matrix.json). Re-run `pnpm matrix:render` after editing the JSON.

Legend: ✅ implemented · 🟡 alpha · — none. `tested` is `unit` (offline unit tests) or `live` (optional live E2E that skips without keys).

| Harness         | **together**                        | **ollama**                          | **openrouter**        |
| --------------- | ----------------------------------- | ----------------------------------- | --------------------- |
| opencode        | ✅ implemented · unit               | ✅ implemented **(default)** · unit | ✅ implemented · unit |
| claude          | ✅ implemented **(default)** · unit | ✅ implemented · unit               | ✅ implemented · unit |
| codex           | ✅ implemented **(default)** · unit | ✅ implemented · unit               | ✅ implemented · unit |
| pi              | 🟡 alpha **(default)** · unit       | — none · unit                       | — none · unit         |
| chatgpt-desktop | 🟡 alpha **(default)** · unit       | — none · unit                       | — none · unit         |

## Notes

- **opencode / together**: via --provider together
- **opencode / ollama**: default; no API key
- **opencode / openrouter**: via --provider openrouter
- **claude / together**: default Together preset
- **claude / ollama**: --provider ollama
- **claude / openrouter**: --provider openrouter
- **codex / together**: default Together preset
- **codex / ollama**: --provider ollama
- **codex / openrouter**: --provider openrouter
- **pi / together**: Together preset only
- **pi / ollama**: not supported (post-1.0 / hardening)
- **pi / openrouter**: not supported (post-1.0 / hardening)
- **chatgpt-desktop / together**: alpha; Together preset
- **chatgpt-desktop / ollama**: not supported
- **chatgpt-desktop / openrouter**: not supported
