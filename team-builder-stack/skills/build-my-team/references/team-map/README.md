# The team map template

The team map is how the team spec is shown. This folder is the only place its layout lives: skills point here and never restate it.

- The Page template in this folder is the team map as a Grok Bot Page, the default view. Its data block is the only part that changes from one person to the next. Its layout has three levels: the team, one bot or bot blueprint, and one skill with its steps.
- `team-map-document.md` is the same map as a Markdown document, if the person prefers one.
- `build_team_map.py` reads the team spec and the skills it names, checks that they hold together, and writes the data into both. It needs only Python 3. Skills don't name it or its options; they point here, and this file is the one place its commands live.

The map draws each bot with its own shape and color by default. If you want, you can give pictures for your bots to fill in the map.

## Build the map

Run it on the computer the person's bots share, with the team spec and a folder holding the person's library skills, one file each:

```bash
python3 build_team_map.py --spec /workspace/team-builder-stack/team-spec.md --skills <folder of library skills> \
  --page /workspace/team-builder-stack/team-map-page.tsx --document /workspace/team-builder-stack/team-map.md
```

Add `--pictures <folder>` when the person has given pictures for their bots, as [How each bot looks](#how-each-bot-looks) says.

Then write the Page from the generated file, as the team map Page under Records and logs, or the Markdown document if the person prefers. It stops with a plain message when the spec doesn't hold together, such as a workflow that runs on a bot the spec doesn't list, a handoff to an unknown bot, or a template recorded as content instead of a location. It warns about what can wait, such as a skill the spec names that isn't in the library yet. The map reads the labeled fields only. A fact it cannot find is marked inferred. It is not filled in.

If the script can't run, fill the Page file's data block by hand from the spec, following the types at the top of that file, and fill the document's slots the same way. Change nothing outside the data block and the slots.

## Check a draft

The team map check is how a skill, a draft skill, the whole library, or the spec is checked before it's saved. Put the draft in the skills folder with the library skills, and run:

```bash
python3 build_team_map.py --check --spec /workspace/team-builder-stack/team-spec.md --skills <folder of library skills>
```

`--check` writes nothing. It exits non-zero and prints a plain list of what is missing, per bot and skill.

## How each bot looks

Each bot on the map is a colored shape with its initials, drawn with plain CSS, so the map ships no image files.

- **Shape and Color.** A bot block under Your team may set `Shape:` to circle, square, hexagon, capsule, leaf, or drop, and `Color:` to a six-digit hex color, such as `#2563eb`. A value set there wins. A Color off the palette is kept as it is, and when that bot's Shape is empty, it still gets a shape from its id, as Defaults says.
- **Defaults.** When either is empty, the script picks it from the bot's id, which is its name in lowercase with hyphens, such as `account-bot`. Colors come from a calm palette of blues, teals, violets, and greens, with no red, amber, or gray. The 48 shape and color pairs sit on a ring where each pair differs from the next in both shape and color, and a hash of the id sets where the bot starts on it. Bots with explicit pairs are placed first. The rest are taken by where they start on the ring, then by id, never by their order in the spec, and each takes the first pair from its start that no other bot has. So the same bots always draw the same map in any order, a bot whose start is free moves no one, and no two bots share both while there are 48 bots or fewer.
- **On a proposed change.** Each bot already on the current map whose Shape and Color lines don't change keeps its current look, so it looks the same in the proposed and the current view. A bot the proposal removes keeps its look, and new bots take pairs no bot on either map holds, so a removed bot shares a look with no remaining bot while a free pair is left. To keep each bot's look fixed for good, the skills that save a changed spec record it on its Shape and Color lines, as Record the looks says.
- **A value the map can't use.** A Shape that isn't on the list, or a Color that isn't a six-digit hex color, is listed by `--check`. When the map is built anyway, the script warns, names the bot, and uses the default for that field.
- **Pictures.** To show a picture instead of the shape, set `Picture:` to the file's path, absolute or relative to the spec's folder, or pass `--pictures <folder>` with one file per bot named by its id, such as `account-bot.png`. A Picture line comes first, then the folder. The script reads each picture when it builds the map, and never copies the file anywhere else. It accepts PNG, JPEG, GIF, and WebP. It shrinks a PNG to at most 96 pixels a side, smaller if needed, writes it again with only its pixels, and embeds it in the map data as a data URI of at most 24 KB. It can't shrink a JPEG, GIF, or WebP, or a PNG it can't open, such as a 16-bit or interlaced one, with the Python standard library, so it embeds one of those only when it is already under 24 KB. Before it does, it drops a JPEG's EXIF, XMP, comment, and other application segments, keeping only the JFIF and Adobe segments a decoder reads, and drops a PNG's text, EXIF, and time chunks. A GIF or WebP is embedded as it is, with any metadata it carries, so remove that first if it matters. A picture that is missing, unreadable, or still over the cap gets a warning, and the map shows that bot's shape and color. The Page does the same for any picture it can't show.

## Show a proposal

The map shows a change before the person says yes:

- **A new team:** add `--proposal "<one line on what will be built>"`. The map shows the proposed team, marked as a proposal.
- **A change to a team:** write the proposed spec to a separate file, and add `--current <the current spec>`. The map marks each bot, skill, step, handoff, system, and routine as added, changed, or removed, and the Page switches between the proposed and the current team. Add `--current-skills` when the proposal changes skills too.

After the yes, record each bot's look in the proposed spec, as [Record the looks](#record-the-looks) says, with `--current <the current spec>` when the proposal changes a team. Then write the proposed spec over the current one and rebuild the map without `--proposal` or `--current`.

## Record the looks

A default look is picked when the map is built, so a later rebuild could move one. To fix every look, a skill that saves a changed spec after the person's yes records the looks first:

```bash
python3 build_team_map.py --record-looks --spec <the spec to save> --current <the spec it replaces>
```

Leave out `--current` when there is no saved spec yet. It writes the look the map showed, the same seeded pick a proposal draws, into each bot's empty Shape and Color lines, adding a line after Connectors when one is missing. It never changes a Shape or Color that is already set, even one the map can't use, and it builds no map. It prints each line it wrote. Run it on a copy of the spec when the change is made in place, with the saved spec as `--current`, then save the copy. The person's yes to the change covers these lines. A rebuild after that draws every bot as the proposal did.
