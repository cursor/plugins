# Spawn retry

The model-failure path. Use when a subagent spawn failed, timed out, or was rejected, and the next step is choosing a model for the retry.

1. Record what failed: the role, the model attempted, and the error.
2. Is the attempted model allowlisted?
   - No → the rule or the spawn violated the lock. Apply **no-fallback-to-banned**: re-spawn on a real allowlisted slug for the role, never an alias. If the role's default is `inherit-parent` or `auto`, the retry takes the role's real-slug default (code roles `Qwen/Qwen3.8-Flash-Next-FP8`, judgment and prose roles the rule file's judgment slug, panel roles one entry of their panel list). An alias retry inherits the parent and can land back on the banned model. Flag the source for an **audit** run.
   - Yes → continue.
3. Re-spawn on a different allowlisted model for the same role. Retries are real slugs, never `inherit-parent`/`auto`: the parent may be the model that just failed, or a banned one. Up to two retries, three attempts total counting the original. Each retry uses a slug different from the previous attempt. For panel roles the retry stays on the two on-prem panel families (**panel-composition**).
4. All retries failed → stop. Tell the user which models were tried and that no allowlisted model worked. Never degrade to a banned model. Never pick a model by availability alone.
