# @localis/core

Local-first audit, privacy, transactional change, local model, and release
verification primitives for [Localis](https://github.com/KebiLab/Localis).

```ts
import { runAudit, runShipCheck } from "@localis/core";

const audit = await runAudit(".");
const ship = await runShipCheck(".");
```

Network access is explicit. Ollama and LM Studio adapters accept loopback HTTP
endpoints only. See the repository privacy and architecture documents before
embedding provider or file-write capabilities.

Licensed under Apache-2.0. Made by KebiLab.
