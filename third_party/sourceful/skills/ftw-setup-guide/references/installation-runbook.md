# Installation and migration runbook — FTW

Authoritative sources (recheck before giving commands):

- https://ftw.sourceful.energy/
- https://github.com/srcfl/ftw/blob/master/docs/native-beta.md
- https://github.com/srcfl/ftw/blob/master/docs/setup-guide/en.md
- https://github.com/srcfl/ftw/releases
- https://github.com/srcfl/ftw/blob/master/docs/ha-integration.md

## First decision: installation vs update vs migration

**Fresh Raspberry Pi 4/5 or Debian/Ubuntu x86_64, 64-bit:** Raspberry Pi OS Lite 64-bit, Debian 12/13 or documented supported 64-bit Linux. Reserve the host's address in DHCP, ensure port 8080 is free, and arrange curl, sudo and SSH on the local network. For Pi, help use Raspberry Pi Imager to flash a *new* card, configure SSH, locale and network, and choose a non-`ftw` Linux account.

**Old FTW on a Pi:** FTW 2.x/3.x and 0.x through 0.130.x are retired. Preserve old SD card and off-device full backup. Flash and physically swap in a **second** SD card before new install. Do not overwrite data and do not treat a refused native install as a reason to install Docker on the old card. The documented guided migration of settings/history is not ready. Ensure only one Core controls the site, including after restart.

**Existing new 0.x native:** Use FTW's supported `ftw update` workflow after checking installed version, backup, data compatibility and current channel. Do not reinstall with `--fresh-host`.

**Advanced Docker:** a separately documented alternative, not the next step after a native install fails. Verify old project, Docker updater, persistent volumes and whether MQTT belongs to it; preserve backups and stop competing Core before changes. Docker host networking can behave differently on macOS.

**Home Assistant:** evaluate current addon support before recommending. A standalone FTW Linux host can integrate over MQTT; verify whether the selected add-on tracks new 0.x or a retired line. Never leave HA and FTW driving the same endpoint independently without explicit ownership policy.

## Fresh native installation

1. Open Releases and identify an **exact** publicly published *new-line* 0.x beta tag (>=0.131.0) with Linux release package and matching SHA-256 for the machine. Do not use the `releases/latest` redirect if it points to a retired line.
2. Show and explain the official installer command from `docs/native-beta.md#install` for the verified tag. Do **not** treat an illustrative `v0.X.Y-beta.N` placeholder as a real command and do not invent a download. Explain that it modifies the host, runs with `sudo`, creates the system service and writes site state; user must review before running.
3. On the confirmed empty host only, have the owner execute the official native installer with `--fresh-host --tag <verified-tag>` using the exact published script for that tag. Confirm successful download and package checksum verification from installer output. Stop if it refuses existing state or a download is missing.
4. Open `http://<host-ip>:8080/setup` **on the LAN**, not the Internet. FTW's installer is documented to put releases in `/opt/ftw`, data in `/var/lib/ftw`, and `ftw` CLI in `/usr/local/bin` for current native path. Do not assume arbitrary setups use these paths.
5. Run read-only checks for runtime/service and correct version (`ftw status` where supported). Confirm reachable setup page and no competing old controller. Proceed to metering and driver setup.

## Step-by-step dialogue behavior

- Ask for the environment/status at each critical branch, not all details at once.
- Explain one action, expected indication, and what to do on failure. Use the next command only after the previous result is known, for high-risk operations.
- If the user supplies an error, identify the failing step and likely causes. Do not chain another installer, delete a working installation, bypass checks, turn off firewalls or change ownership of private files just to get past a refusal.
- Ask the user to redact passwords, API tokens, QR codes, home IDs, full street addresses and serials from copied logs.
