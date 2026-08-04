# @localis/cli

The command-line interface for [Localis](https://github.com/KebiLab/Localis), a
private, local-first developer workspace by KebiLab.

```bash
npx @localis/cli audit .
npx @localis/cli privacy .
npx @localis/cli test .
npx @localis/cli ship .
```

AI workflows support Ollama, LM Studio, and OpenAI-compatible HTTPS APIs. API
keys are read from an environment variable and are never accepted as a command
line value. Change plans are previewed, hash checked, backed up, and never
applied without explicit confirmation.

```powershell
$env:OPENAI_API_KEY = "your-key"
npx @localis/cli models --provider openai-compatible `
  --endpoint https://api.openai.com/v1 --api-key-env OPENAI_API_KEY
```

Licensed under Apache-2.0.
