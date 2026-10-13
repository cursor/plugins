---
name: principle-inherit-parent-honestly
description: "Apply to any role mapped to inherit-parent or auto in the on-prem stack. The alias inherits the parent chat model, it does not grant on-prem status. A role is on-prem only when the parent chat is."
disable-model-invocation: true
---

# Inherit-Parent Honestly

`inherit-parent` and `auto` mean "run on the parent chat model." They do not mean "run on an on-prem model." They are on-prem only when the parent is.

**Why:** The alias is the one value in the closed set that the rule file does not pin. It is a pointer, and a pointer can be to anywhere. If the parent chat runs on a frontier model, then every `inherit-parent` role in the stack silently runs on that frontier model, and the on-prem property of the run is gone without a single banned slug appearing in the configuration.

How to apply:

- **Check the parent before you trust the alias.** When a role line is `inherit-parent` or `auto`, confirm the parent chat model is on-prem (itself `inherit-parent` up to a pinned on-prem model, or one of the four allowlisted slugs). If the parent is a frontier model, the alias role is not on-prem.
- **Pin roles you need on-prem.** Roles that must stay on-prem regardless of the chat — code delegates, panels, judges — pin to a real allowlisted slug, not to the alias. The alias is for roles where "whatever the user is chatting on" is acceptable. Acceptable means acceptable to the user, who can see the parent model. It is not an exception to the **banned-set**, which covers every slug that is written, offered, presented, selected, or defaulted, and the alias writes no slug at all.
- **Report the inheritance.** When a spawn uses `inherit-parent`, name in the reply what it inherited and confirm that is on-prem. A silent inheritance is the failure mode this principle exists to catch.

The aliases are in the closed set because they are a valid *value*, not because they are a valid *on-prem guarantee*. The guarantee comes from the parent.
