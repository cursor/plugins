#!/usr/bin/env node

import { main, readStdin } from './record-work-graph-event.mjs';

readStdin()
  .then((stdinText) =>
    main({ argv: ['--event=subagent_stop', '--source_client=cursor'], stdinText })
  )
  .then(() => process.exit(0))
  .catch(() => process.exit(0));
