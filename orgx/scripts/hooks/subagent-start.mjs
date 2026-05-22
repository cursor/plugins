#!/usr/bin/env node

import { exitCodeForResult, main, readStdin } from './record-work-graph-event.mjs';

readStdin()
  .then((stdinText) =>
    main({ argv: ['--event=subagent_start', '--source_client=cursor'], stdinText })
  )
  .then((result) => process.exit(exitCodeForResult(result)))
  .catch((error) => {
    process.stderr.write(`OrgX Cursor subagent-start hook failed: ${error.message}\n`);
    process.exit(1);
  });
