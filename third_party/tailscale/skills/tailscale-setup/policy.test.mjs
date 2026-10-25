import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const skillPath = fileURLToPath(new URL("./SKILL.md", import.meta.url));

const SRC_AUTO = new Set([
  "admin",
  "member",
  "owner",
  "it-admin",
  "network-admin",
  "billing-admin",
  "auditor",
  "tagged",
  "shared",
]);
const DST_AUTO = new Set([...SRC_AUTO, "internet", "self"]);

function parseHu(text) {
  return JSON.parse(text.replace(/,(\s*[}\]])/g, "$1"));
}

function isIpOrCidr(value) {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/.exec(
    value
  );
  if (!match) return false;
  const octets = [match[1], match[2], match[3], match[4]].map(Number);
  if (octets.some((octet) => octet > 255)) return false;
  return match[5] === undefined || Number(match[5]) <= 32;
}

function isSelector(value, { destination, hosts }) {
  if (value === "*") return true;
  if (/^(?:group|tag|ipset):[^:\s]+$/.test(value)) return true;
  if (destination && /^svc:[^:\s]+$/.test(value)) return true;
  const auto = /^autogroup:([^:\s]+)$/.exec(value);
  if (auto) return (destination ? DST_AUTO : SRC_AUTO).has(auto[1]);
  if (/^[^:\s]+@[^:\s]+$/.test(value)) return true;
  if (isIpOrCidr(value)) return true;
  return hosts.has(value);
}

function isPort(value) {
  if (value === "*") return true;
  if (/^\d{1,5}$/.test(value)) return Number(value) <= 65535;
  if (/^\d{1,5}-\d{1,5}$/.test(value)) return true;
  if (/^[a-z0-9]+:\*$/.test(value)) return true;
  return /^[a-z0-9]+:\d{1,5}(?:-\d{1,5})?$/.test(value);
}

function grantErrors(policy) {
  const hosts = new Map(Object.entries(policy.hosts ?? {}));
  const errors = [];
  for (const [alias, address] of hosts) {
    if (!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(alias))
      errors.push(`hosts key ${alias} is not an alias`);
    if (!isIpOrCidr(address))
      errors.push(`hosts ${alias} is not an IP or CIDR`);
  }
  for (const grant of policy.grants ?? []) {
    for (const src of grant.src ?? [])
      if (!isSelector(src, { destination: false, hosts }))
        errors.push(`src ${src} is not a grant selector`);
    for (const dst of grant.dst ?? [])
      if (!isSelector(dst, { destination: true, hosts }))
        errors.push(`dst ${dst} is not a grant selector`);
    for (const port of grant.ip ?? [])
      if (!isPort(port)) errors.push(`ip ${port} is not a port selector`);
  }
  return errors;
}

test("every pasted grant uses selectors the policy file can save", () => {
  const text = readFileSync(skillPath, "utf8");
  const blocks = [...text.matchAll(/```hujson\n([\s\S]*?)```/g)].map((match) =>
    parseHu(match[1])
  );
  assert.ok(blocks.length >= 2, "expected the personal and company policies");
  const errors = blocks.flatMap(grantErrors);
  assert.deepEqual(errors, []);
});
