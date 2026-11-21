# pstack.osb.client.v1

This is a client boundary, not another authority wire API. Config explicitly enables the extension and selects `osb-firstmate.coord.project.v2`. The helper emits the existing `coord.project.v1` envelope to a supervisor-fixed argv route and requires discovered schema 10/profile `firstmate.scoped.v2` plus configured current authority ID. It downloads no service and depends on no unpublished implementation for ordinary PStack use. Only an operator-provisioned compatible endpoint enables this optional route; candidate source is not deployed compatibility evidence.

Configuration example (private, synthetic; never use these IDs for live setup):

```json
{"contract":"pstack.osb.client.v1","enabled":true,"mapping":"osb-firstmate.coord.project.v2","route":["/usr/bin/ssh","-T","approved-fixed-endpoint"],"journal":"/private/coordinator-a/osb-journal","scope_id":"synthetic-project","authority_id":"VERIFIED_CURRENT_ID","membership_epoch":1,"home_id":"coordinator-a","repo":"fixture-owner/fixture-repo","forge_host":"github.com","forge_repo_id":"10001"}
```

Operator owns config, journal and executable route; task/model JSON cannot choose caller/database, internal `_` evidence or override configured identities. SSH arguments must already select a separately approved forced command; this proposal sets up no keys/accounts. Do not share private journals between homes or put credentials/raw prompts in them. Journal identity covers route, scope, authority/member, home and immutable repository. Restore/rejoin uses explicit reviewed new binding and sessions; never rewrite delayed requests under new authority.

Input has contract, operation and payload. Allowed lifecycle operations: `enroll`, `session`, `submit`, `claim`, `check`, `renew`, `release`, `publish-head`, `scope-status`, `scope-inspect`. Payload retains native reviewed fields: session generation is not claim fence. Mutations must supply stable request ID. Request is fsynced before dispatch; uncertain reply stays pending. Repeating identical request calls authority again, including authorization before replay. Conflicting key/body or journal binding refuses. No automatic retries with new keys and no cache-only grant.

Request/config input is bounded at 64 KiB and the native envelope at 64 KiB; receipt is bounded at 128 KiB, durable journal entries at 256 KiB to retain accepted request plus receipt. A local nonblocking lock protects journal identity and writes. Route/member/authority changes require an explicitly reviewed fresh journal; existing journal identity cannot be silently replaced. Files are durably replaced on one private host filesystem; do not share this journal via NFS or treat it as multiuser authority.

The fully contextualized native envelope is size-checked before journaling a request or contacting authority discovery. A locally rejected oversized envelope creates no mutation entry, so a smaller body may reuse that uncommitted key. Once a request is journaled, its key/body binding remains immutable even when its reply is uncertain.

```json
{"contract":"pstack.osb.client.v1","operation":"submit","payload":{"request_id":"submit-a","intent_id":"intent-a","generation":1,"base":"refs/heads/main","base_oid":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","branch":"work/a","task_id":"unit-a","goal":"Synthetic shared unit","resources":[{"type":"file","name":"src/shared.py"}]}}
```

`checkpoint` takes current native intent/home generation/claim/fence fields in payload and `expected_revision` containing exact base/head OIDs. It verifies this home's successful immutable submit in the journal, the scoped claim's intent binding, then live check and published head. Base binding comes from the successful submitted intent, **not a fresh forge base read**. Provider IDs/digest/run admission are not checked. The response is a short-lived cooperative observation; TOCTOU remains before a later external effect. Test Git/CI sinks are mocks. Arbitrary direct commands can bypass this helper; prose does not enforce ownership. No `exec` command launches an effect.

Native v2 capabilities outside this thin client: integration primary epoch and primary-owned wrapper PID/start/host/attempt, safe unmerged reconciliation conditions, CI capacity/admission (`ok:true,admitted:false` is queued), scoped completion, and migration/recovery. Existing owner suites govern them. The helper cannot authorize CI because it exposes neither pulse nor completion. Generic completion, named atomic task-writer transfer and GitHub projection remain absent.

No change to PStack plugin manifest, existing `orch` runtime, store format or default playbook. Opt-in callers load this separate skill, add the checkpoint to their own approved launch/worker route, and retain the named single stacker and all verification/landing guards. This is useful lifecycle integration, not installed enforcement.
