# localis

Private, local-first code audits, AI change plans, and release checks from [KebiLab/Localis](https://github.com/KebiLab/Localis).

```bash
npm install --global localis
localis doctor
localis audit .
localis privacy .
localis ship .
```

Run once without installing:

```bash
npx localis audit .
```

AI workflows support Ollama, LM Studio, and OpenAI-compatible HTTPS APIs. Keys are read from environment variables. Change plans are previewed, hash checked, backed up, and never applied without explicit confirmation.

Full documentation: [localis.dev/docs](https://localis.dev/docs)

Apache-2.0 · Made by KebiLab.
