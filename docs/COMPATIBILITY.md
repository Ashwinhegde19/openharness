# Compatibility Model

## 1. Purpose

This document defines how compatibility is evaluated, recorded, communicated, and maintained between coding harnesses, provider APIs, and models.

A successful text response does not prove that streaming, tools, vision, reasoning controls, usage, cancellation, cleanup, or configuration preservation work correctly.

## 2. Compatibility tuple

Every claim applies to:

```text
product version
+ operating system
+ harness name and version
+ provider
+ provider protocol
+ model ID or family
+ capability
+ compatibility-policy version
```

A claim missing one of these dimensions is incomplete.

## 3. Compatibility levels

### Level 0 - Unsupported

The combination is known not to launch, cannot safely represent required behavior, or violates a security/configuration requirement.

### Level 1 - Basic text

A non-streaming text request completes. Streaming, tools, cancellation, and error mapping are not implied.

### Level 2 - Text and streaming

Basic text and streaming pass the contract suite. Tool support is not implied.

### Level 3 - Agent tools

Text, streaming, a standard tool call, tool result, and final response pass. At least one end-to-end coding task completes.

### Level 4 - Extended capabilities

Level 3 plus explicitly listed capabilities such as parallel tools, vision, structured output, reasoning controls, reliable usage, or tested long context.

### Level 5 - Recommended

The combination has passed the full supported suite, repeated real tasks, configuration integrity, crash cleanup, and declared platform coverage. It is recommended within published limitations.

## 4. Verification states

- **Untested** - configuration exists but no evidence.
- **Inferred** - expected based on related protocol evidence, not directly tested.
- **Tested** - contract and integration tests passed.
- **Recommended** - sustained real-task and release review passed.
- **Regressed** - previously passed but now fails.

The UI and docs must distinguish Inferred from Tested.

## 5. Capability dimensions

| Capability             | Values                                 |
| ---------------------- | -------------------------------------- |
| Launch                 | pass / fail                            |
| Basic text             | pass / fail                            |
| Streaming              | pass / partial / fail                  |
| Single tools           | pass / partial / fail                  |
| Parallel tools         | pass / partial / fail                  |
| Tool-result round trip | pass / partial / fail                  |
| Vision                 | pass / partial / fail / not applicable |
| Reasoning controls     | pass / mapped / ignored / fail         |
| Structured output      | pass / partial / fail                  |
| Usage reporting        | exact / partial / unavailable          |
| Context handling       | tested limit / advertised / unknown    |
| Cancellation           | pass / partial / fail                  |
| Error mapping          | pass / partial / fail                  |
| Config preservation    | pass / fail                            |
| Cleanup                | pass / partial / fail                  |

## 6. Initial target matrix

This is a planning target, not an implementation claim.

| Harness     | Provider    | Model category            | Target level | Route                   | Main risk                       |
| ----------- | ----------- | ------------------------- | -----------: | ----------------------- | ------------------------------- |
| OpenCode    | Together AI | tested coding model       |            3 | inline/direct           | regression from baseline        |
| OpenCode    | Ollama      | tool-capable local coder  |            3 | inline/direct           | tool template and model quality |
| OpenCode    | OpenRouter  | tool-capable coding model |          3-4 | inline/direct           | provider/model variability      |
| OpenCode    | Groq        | supported tool model      |            3 | inline/direct           | unsupported request fields      |
| Claude Code | Together AI | tested coding model       |            3 | Messages-to-Chat proxy  | translation correctness         |
| Claude Code | OpenRouter  | tool-capable coding model |            3 | Messages-to-Chat proxy  | streaming and tools             |
| Claude Code | Ollama      | local tool-capable coder  |          2-3 | Messages-to-Chat proxy  | model tool reliability          |
| Codex       | Together AI | tested coding model       |            3 | Responses-to-Chat proxy | Responses feature loss          |
| Codex       | OpenRouter  | supported coding model    |            3 | Responses-to-Chat proxy | event mapping                   |
| Codex       | Groq        | supported model           |          2-3 | Responses-to-Chat proxy | fields and tool semantics       |

## 7. Harness acceptance checklist

A harness cannot be labeled supported until these are documented and tested.

### Identity and installation

1. Official name and executable.
2. Supported installation methods.
3. Version detection command.
4. Minimum and maximum tested versions.
5. Supported operating systems.

### Configuration behavior

6. Base URL override mechanism.
7. API key override mechanism.
8. Model override mechanism.
9. Inline config support.
10. Alternate config-home or shadow-home support.
11. Files read and written during launch.
12. Files modified during a normal session.
13. Background services or update processes.

### Protocol behavior

14. Request protocol.
15. Streaming protocol.
16. Tool-call format.
17. Vision input format.
18. Reasoning controls.
19. Context compaction behavior.
20. Error and retry behavior.

### Runtime behavior

21. Argument passthrough.
22. Signal handling.
23. Child processes.
24. First-party telemetry or network calls.
25. Cleanup requirements.

### Evidence

26. Harness contract tests.
27. Config-integrity test.
28. End-to-end coding task.
29. Crash cleanup test.
30. Published limitations.

## 8. Provider acceptance checklist

### Connection

1. Provider ID and label.
2. Base URL.
3. Supported protocol.
4. Authentication type.
5. Required headers.
6. Redirect behavior.
7. Model discovery behavior.

### Request compatibility

8. Token-limit field.
9. Temperature support/range.
10. Tool support.
11. Parallel-tool support.
12. Tool-choice support.
13. Structured-output support.
14. Vision support.
15. Reasoning fields.
16. Streaming usage support.
17. Unsupported parameters and error behavior.

### Operational behavior

18. Rate-limit status and headers.
19. Timeout behavior.
20. Context-limit errors.
21. Returned model identity.
22. Usage fields.
23. Pricing source.
24. Regional or policy restrictions relevant to operation.

### Evidence

25. Basic text contract.
26. Streaming contract.
27. Tool contract.
28. Error contract.
29. Cancellation test.
30. Policy tests.

## 9. Model acceptance checklist

A provider exposing many models does not make all models supported.

A recommended model/provider pair requires:

- exact model ID tested;
- text and streaming pass;
- tools pass for tool-dependent harnesses;
- context/output behavior documented;
- prompt-template limitations documented;
- no consistent malformed tool calls in the standard suite;
- testing through the exact provider, not only another host of the same model.

## 10. Compatibility-policy rules

1. No silent model substitution.
2. No silent disabling of essential tools.
3. Removed fields are documented and visible in debug output.
4. A semantic downgrade produces a warning.
5. One normalization retry is allowed only when safe and documented.
6. Policies are versioned.
7. Every rule has a fixture.
8. A provider policy cannot claim model capability evidence.

## 11. Version drift

Compatibility can regress when:

- a harness changes config or protocol behavior;
- a provider changes compatibility behavior;
- a model revision changes tool quality;
- a dependency changes stream parsing;
- an operating system changes process behavior.

The matrix records exact or bounded versions and test dates. "Latest" alone is not sufficient.

## 12. Machine-readable format

The repository should maintain a machine-readable matrix, for example:

```yaml
entries:
  - productVersion: 0.1.0-alpha.1
    os: linux
    harness:
      id: opencode
      version: "1.x"
    provider:
      id: ollama
      policyVersion: "1"
    model:
      id: qwen-coder
    level: 3
    verification: tested
    capabilities:
      text: pass
      streaming: pass
      tools: pass
      configPreservation: pass
      cleanup: pass
    testedAt: 2026-07-15
```

## 13. User-facing wording

Recommended:

- "Tested for text, streaming, and tools."
- "Expected to work, but not directly tested."
- "Vision is unavailable through this translation path."
- "The provider ignores reasoning effort."
- "This model is not recommended for tool-dependent coding agents."

Avoid:

- "Works with everything."
- "Fully compatible" without a defined suite.
- "Same as Claude/OpenAI" when translation loses features.

## 14. Re-test policy

An entry should be re-tested when:

- the harness moves outside its tested version range;
- the provider changes API version or behavior;
- the model ID points to a new revision;
- the protocol adapter changes;
- the provider policy changes;
- a relevant runtime dependency changes;
- a regression issue is reported with reproducible evidence.
