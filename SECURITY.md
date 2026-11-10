# Security

Report a suspected credential leak or vulnerability through [GitHub private vulnerability reporting](https://github.com/mkhomutskyi/relay-defense-ai-comparison/security/advisories/new). Do not put keys, personal records or private server details in a public issue. Never include a working credential in a report; give its type and location instead.

This repository contains browser games and the comparison site. Playing needs no AI API key, account or connection to the owner's server. Keep model weights, raw agent sessions, infrastructure inventories and credential files outside the repository.

The games are frozen experiment results. Report security problems against the current published revision. A fix that changes a game must become a separate version; keep the recorded baseline and its known defects identifiable. No response-time guarantee is offered.

The optional rating Worker is not deployed publicly. Its origin checks and per-token throttling do not establish one person per vote. Before enabling it, configure the real database/origin, edge abuse controls and accurate privacy/retention notes. Do not treat the development configuration as production-ready.

GitHub secret scanning and push protection are enabled. The repository check also checks private paths, credential patterns, media provenance and frozen source hashes. These checks reduce risk; they cannot prove that every possible secret or vulnerability is absent.
