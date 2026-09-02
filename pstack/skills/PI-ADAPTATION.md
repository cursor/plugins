# pi adaptation of pstack

Adapted for the [pi coding agent](https://pi.dev), which has no Task tool and
no subagent infrastructure. Start with [SUBAGENT-ADAPTER.md](./SUBAGENT-ADAPTER.md)
— it defines the substitutions applied wherever a skill says to spawn a
subagent (delegate → inline, parallel fan-out → sequential, model config →
parent session model).

Skills touched: arena, automate-me, how, interrogate,
maintain-verification-skill, no-comments, poteto-mode (SKILL.md + all
playbooks), principle-build-the-lever, principle-guard-the-context-window,
recall, reflect, setup-pstack (rewritten), show-me-your-work, swarm, why.
