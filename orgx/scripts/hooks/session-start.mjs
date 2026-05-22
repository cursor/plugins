#!/usr/bin/env node

import { main, readStdin } from './record-work-graph-event.mjs';

readStdin()
  .then((stdinText) =>
    main({ argv: ['--event=session_start', '--source_client=cursor'], stdinText })
  )
  .then(() => process.exit(0))
  .catch(() => process.exit(0));
