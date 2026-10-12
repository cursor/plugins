# The team map template

The team map is how the team spec is shown. This folder is the only place its layout lives: skills point here and never restate it.

- `team-map.canvas.tsx` is the map as a Grok Bot canvas, the default view: one self-contained React module that imports only from the canvas SDK. Its data block is the only part that changes from one person to the next. Its layout has three levels: the team, one bot or bot blueprint, and one skill with its steps.
- `team-map-document.md` is the same map as a Markdown document, for accounts where canvases aren't available.
- `build_team_map.py` reads the team spec and the skills it names, checks that they hold together, and writes the data into both. It needs only Python 3.

## Build the map

Run it on the computer the person's bots share, with the team spec and a folder holding the person's library skills, one file each:

```bash
python3 build_team_map.py --spec /workspace/team-builder-stack/team-spec.md --skills <folder of library skills> \
  --canvas /workspace/team-builder-stack/team-map.canvas.tsx --document /workspace/team-builder-stack/team-map.md
```

Then write the canvas from the generated module, by its canvas id under Records and logs, or the document when canvases aren't available. It stops with a plain message when the spec doesn't hold together, such as a workflow that runs on a bot the spec doesn't list, a handoff to an unknown bot, or a template recorded as content instead of a location. It warns about what can wait, such as a skill the spec names that isn't in the library yet.

If the script can't run, fill the canvas's data block by hand from the spec, following the types at the top of the module, and fill the document's slots the same way. Change nothing outside the data block and the slots.

## Show a proposal

The map shows a change before the person says yes:

- **A new team:** add `--proposal "<one line on what will be built>"`. The map shows the proposed team, marked as a proposal.
- **A change to a team:** write the proposed spec to a separate file, and add `--current <the current spec>`. The map marks each bot, skill, step, handoff, and system as added, changed, or removed, and the canvas switches between the proposed and the current team. Add `--current-skills` when the proposal changes skills too.

After the yes, write the proposed spec over the current one and rebuild the map without `--proposal` or `--current`.
