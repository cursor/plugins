import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Code,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Link,
  Pill,
  Row,
  Stack,
  Table,
  Text,
  useHostTheme,
} from "cursor/canvas";

export default function FounderGtmPlaybook() {
  const theme = useHostTheme();

  return (
    <Stack gap={32} style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
      <Hero />
      <Premise />
      <FrameworkTimeline />
      <ChannelsSection />
      <InsideTheLoop />
      <AlternativeStackSection />
      <SkillsSection />
      <RecommendedSequence />
      <ResourcesFooter />

      <Text style={{ color: theme.text.tertiary, fontSize: 12, textAlign: "center" as const }}>
        founder-gtm v0.4.0 · plugin + canvas + resources.md
      </Text>
    </Stack>
  );
}

function Hero() {
  const theme = useHostTheme();
  return (
    <Stack gap={16}>
      <Row gap={8} align="center">
        <Pill tone="info" size="sm">v0.4.0</Pill>
        <Pill tone="neutral" size="sm">Early-stage founders</Pill>
      </Row>
      <H1>Founder GTM best practices with Cursor</H1>
      <Text style={{ color: theme.text.secondary, fontSize: 16, lineHeight: "24px" }}>
        Most early founders fall into one of two traps. They blast generic AI templates that
        go straight to spam, or they do nothing because the standard outbound stack costs
        $1,500 to $3,000 a month. This is a third path: an opinionated set of skills,
        scripts, and automations that run from inside Cursor, send 25 real messages a day,
        and get sharper every week.
      </Text>

      <Grid columns={4} gap={12} style={{ marginTop: 8 }}>
        <StatCard value="10" label="Skills" />
        <StatCard value="6" label="Helper scripts" />
        <StatCard value="5" label="Automations" />
        <StatCard value="3" label="Starter plays" />
      </Grid>
    </Stack>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  const theme = useHostTheme();
  return (
    <div
      style={{
        border: `1px solid ${theme.stroke.tertiary}`,
        borderRadius: 8,
        padding: "16px 20px",
        background: theme.bg.editor,
      }}
    >
      <Stack gap={4}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: 590,
            color: theme.text.primary,
            lineHeight: "26px",
          }}
        >
          {value}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.tertiary }}>{label}</Text>
      </Stack>
    </div>
  );
}

function Premise() {
  return (
    <Callout
      tone="info"
      title="What this plugin actually does that's different"
    >
      <Stack gap={8}>
        <Bullet>
          <Text>
            <Text weight="semibold">Reply classifier with a 5-category rubric</Text>:
            positive, objection, neutral, OOO, negative. Applied only to the first inbound
            message per thread, so follow-up chatter doesn't pollute the intent signal.
          </Text>
        </Bullet>
        <Bullet>
          <Text>
            <Text weight="semibold">Per-person-enrolled denominators</Text>, not per-message.
            A 4-touch sequence inflates message counts and makes plays incomparable. Every
            metric divides by unique people who got at least one touch.
          </Text>
        </Bullet>
        <Bullet>
          <Text>
            <Text weight="semibold">Signal-first retirement rule</Text>. At N ≥ 15 sends
            with 0 positives across 2 cycles, the play is retired. Most weak plays don't
            recover from copy tweaks; the signal or persona is wrong.
          </Text>
        </Bullet>
        <Bullet>
          <Text>
            <Text weight="semibold">4-touch cadence with an offer ladder</Text> matched to
            signal strength. High-signal plays ask for the meeting on touch 1; low-signal
            plays lead with content and never ask for a call.
          </Text>
        </Bullet>
        <Bullet>
          <Text>
            <Text weight="semibold">Do-not-re-offer rule</Text>. If the prospect already
            consumed the asset (downloaded the guide, attended the webinar), the next touch
            is what comes after the asset, not the asset again.
          </Text>
        </Bullet>
        <Bullet>
          <Text>
            <Text weight="semibold">Always-on voice rule</Text> that drafts from your
            collected samples and refuses to generate filler. If a draft can't anchor to a
            specific signal in the last 30 days, the skill refuses to send.
          </Text>
        </Bullet>
        <Bullet>
          <Text>
            <Text weight="semibold">Title classifier and signal scorer</Text> shipped as
            editable Python (a 200-line keyword + exclusion list), distilled from the kind
            of golden-list scripts internal growth teams build for outbound enrichment.
          </Text>
        </Bullet>
        <Text style={{ marginTop: 4 }} italic>
          These mechanisms are non-proprietary patterns from how Cursor's growth team
          operates outbound, distilled into something a single founder can run.
        </Text>
      </Stack>
    </Callout>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  const theme = useHostTheme();
  return (
    <Row gap={8} align="start">
      <div
        style={{
          width: 4,
          height: 4,
          borderRadius: 2,
          background: theme.text.tertiary,
          marginTop: 9,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>{children}</div>
    </Row>
  );
}

function FrameworkTimeline() {
  const theme = useHostTheme();
  const steps = [
    {
      num: "01",
      name: "Identify",
      summary: "Find people with a real reason to listen this week.",
      how: "Recency is the cheapest personalization. Someone who just raised, just shipped, just hired, or just complained about your problem is open to a message in a way they won't be next month.",
    },
    {
      num: "02",
      name: "Resonate",
      summary: "Open with one real thing about them, in your voice.",
      how: "The first sentence has to do work. Reference the post, the round, the hire. Skip the part where you introduce yourself; they figure that out from your signature.",
    },
    {
      num: "03",
      name: "Time",
      summary: "Send while the moment is still warm.",
          how: "A message about something from yesterday lands. The same message about something from last month gets archived. gtm-find-prospects ranks by signal recency for a reason.",
    },
    {
      num: "04",
      name: "Follow up",
      summary: "Most positives come from touches 2 to 4, not touch 1.",
      how: "Pre-write the four-touch sequence the moment you send the first. Use a different angle on every touch. Never send a fifth. The breakup acknowledges they're busy and asks one binary question.",
    },
  ];

  return (
    <Stack gap={20}>
      <Stack gap={4}>
        <H2>The framework</H2>
        <Text style={{ fontSize: 14 }}>
          Four steps. None are novel. The leverage comes from doing all four well at the
          same time, which is what a one-person sales motion usually can't pull off.
        </Text>
      </Stack>

      <Grid columns={4} gap={0}>
        {steps.map((step, i) => (
          <Stack
            key={step.num}
            gap={14}
            style={{ paddingRight: i === steps.length - 1 ? 0 : 16 }}
          >
            <TimelineHeader
              num={step.num}
              isLast={i === steps.length - 1}
              theme={theme}
            />
            <Stack gap={8}>
              <H3>{step.name}</H3>
              <Text style={{ color: theme.text.secondary, fontSize: 13 }}>
                {step.summary}
              </Text>
              <Text style={{ fontSize: 12, color: theme.text.tertiary }}>{step.how}</Text>
            </Stack>
          </Stack>
        ))}
      </Grid>
    </Stack>
  );
}

function TimelineHeader({
  num,
  isLast,
  theme,
}: {
  num: string;
  isLast: boolean;
  theme: ReturnType<typeof useHostTheme>;
}) {
  return (
    <Row align="center" gap={0}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          border: `1px solid ${theme.stroke.primary}`,
          background: theme.bg.elevated,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: 590,
            color: theme.accent.primary,
            letterSpacing: 0.3,
          }}
        >
          {num}
        </Text>
      </div>
      {!isLast && (
        <Row align="center" style={{ flex: 1, marginLeft: 4 }}>
          <div style={{ flex: 1, height: 1, background: theme.stroke.secondary }} />
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            style={{ display: "block", marginLeft: -1 }}
          >
            <path
              d="M2 1 L6 4 L2 7"
              stroke={theme.stroke.secondary}
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Row>
      )}
    </Row>
  );
}

function ChannelsSection() {
  return (
    <Stack gap={16}>
      <Stack gap={4}>
        <H2>The three channels worth running</H2>
        <Text style={{ fontSize: 14 }}>
          Pick one to start. Add a second only after the first is consistently producing
          replies. Running all three on day one is how founders end up with three half-broken
          campaigns and no idea what's working.
        </Text>
      </Stack>

      <Grid columns={3} gap={12}>
        <ChannelCard
          channel="X DMs"
          handle="gtm-x-outreach"
          best="Tech founders selling to other tech founders. Devtools, AI, infra, design tools."
          stack="xmcp local MCP server. Free OAuth to your X account. Pay per DM beyond the X API free tier."
          limits="10 to 50 DMs per day depending on account age and follower count."
          pillTone="info"
        />
        <ChannelCard
          channel="LinkedIn"
          handle="gtm-linkedin-outreach"
          best="B2B SaaS, enterprise sales, anywhere the buyer doesn't live on X."
          stack="Lemlist is the recommended path. Amplemarket, La Growth Machine, or manual copy-paste also work."
          limits="Around 100 connection requests per week before LinkedIn flags the account."
          pillTone="success"
        />
        <ChannelCard
          channel="Cold email"
          handle="gtm-cold-email"
          best="When you have verified emails. Best channel for anything that needs more than a sentence or two."
          stack="Gmail through Google Workspace, gcloud CLI, a dedicated outbound subdomain."
          limits="25 per day default cap. Warm the domain for 2 to 4 weeks first if it's never sent cold email."
          pillTone="warning"
        />
      </Grid>
    </Stack>
  );
}

function ChannelCard({
  channel,
  handle,
  best,
  stack,
  limits,
  pillTone,
}: {
  channel: string;
  handle: string;
  best: string;
  stack: string;
  limits: string;
  pillTone: "info" | "success" | "warning";
}) {
  const theme = useHostTheme();
  return (
    <Card>
      <CardHeader trailing={<Pill tone={pillTone} size="sm">{handle}</Pill>}>
        {channel}
      </CardHeader>
      <CardBody>
        <Stack gap={10}>
          <Stack gap={2}>
            <Text style={{ fontSize: 11, color: theme.text.tertiary, fontWeight: 590 }}>
              BEST FOR
            </Text>
            <Text style={{ fontSize: 13 }}>{best}</Text>
          </Stack>
          <Stack gap={2}>
            <Text style={{ fontSize: 11, color: theme.text.tertiary, fontWeight: 590 }}>
              STACK
            </Text>
            <Text style={{ fontSize: 13, color: theme.text.secondary }}>{stack}</Text>
          </Stack>
          <Stack gap={2}>
            <Text style={{ fontSize: 11, color: theme.text.tertiary, fontWeight: 590 }}>
              LIMITS
            </Text>
            <Text style={{ fontSize: 13, color: theme.text.secondary }}>{limits}</Text>
          </Stack>
        </Stack>
      </CardBody>
    </Card>
  );
}

function InsideTheLoop() {
  return (
    <Stack gap={16}>
      <Stack gap={4}>
        <H2>Inside the learning loop</H2>
        <Text style={{ fontSize: 14 }}>
          The plugin is opinionated about how you measure outbound. The shared rubric and
          the subject-line catalog below are what /gtm-get-better classifies against every week.
        </Text>
      </Stack>

      <Grid columns="3fr 2fr" gap={16}>
        <Stack gap={10}>
          <H3>The reply rubric</H3>
          <Text style={{ fontSize: 13 }}>
            Every first inbound message gets exactly one of these labels. OOO replies stop
            the sequence but are excluded from the positive-rate denominator.
          </Text>
          <Table
            headers={["Label", "What it means", "Example"]}
            rows={[
              [
                <Pill tone="success" size="sm">positive</Pill>,
                <Text style={{ fontSize: 12 }}>
                  Real interest, follow-up question, agreed to a meeting.
                </Text>,
                <Text style={{ fontSize: 12 }}>"Sure, would love to chat."</Text>,
              ],
              [
                <Pill tone="warning" size="sm">objection</Pill>,
                <Text style={{ fontSize: 12 }}>
                  Engaged but pushed back. Usually worth answering.
                </Text>,
                <Text style={{ fontSize: 12 }}>"We're already on a competitor."</Text>,
              ],
              [
                <Pill tone="neutral" size="sm">neutral</Pill>,
                <Text style={{ fontSize: 12 }}>
                  Replied but no clear engagement or pushback.
                </Text>,
                <Text style={{ fontSize: 12 }}>"Got it, thanks."</Text>,
              ],
              [
                <Pill tone="info" size="sm">OOO</Pill>,
                <Text style={{ fontSize: 12 }}>
                  Auto-reply, vacation, or role-change responder.
                </Text>,
                <Text style={{ fontSize: 12 }}>"I'm out until Monday."</Text>,
              ],
              [
                <Pill tone="deleted" size="sm">negative</Pill>,
                <Text style={{ fontSize: 12 }}>
                  Hard no, unsubscribe, angry reply, mark-as-spam.
                </Text>,
                <Text style={{ fontSize: 12 }}>"Stop emailing me."</Text>,
              ],
            ]}
          />
        </Stack>

        <Stack gap={10}>
          <H3>Subjects: what works, what fails</H3>
          <Text style={{ fontSize: 13 }}>
            Auto-flagged by /gtm-get-better even before N ≥ 15. The fail patterns are retired
            with thousands of sends behind the call.
          </Text>
          <Card>
            <CardHeader>Works</CardHeader>
            <CardBody>
              <Stack gap={6}>
                <SubjectExample label="Pain or scaling question" example='"Scaling outbound to 100/day?"' />
                <SubjectExample label="{{Company}}'s {{topic}}" example='"Acme\u2019s developer velocity"' />
                <SubjectExample label="Practical value, not pitch" example='"How we cut review time at Brex"' />
                <SubjectExample label="Re: thread on follow-ups" example='"Re: Acme\u2019s developer velocity"' />
              </Stack>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>Fails</CardHeader>
            <CardBody>
              <Stack gap={6}>
                <SubjectExample label="Aspirational claims" example='"10x your engineers"' tone="fail" />
                <SubjectExample label="Product or version launches" example='"Acme 2.0 is here"' tone="fail" />
                <SubjectExample label="Generic thought leadership" example='"Ramping on unfamiliar codebases"' tone="fail" />
                <SubjectExample label="Vague social proof" example='"Top teams are accelerating with Acme"' tone="fail" />
              </Stack>
            </CardBody>
          </Card>
        </Stack>
      </Grid>

      <Callout tone="neutral" title="Retire fast, iterate signal first">
        At N ≥ 15 sends, 0 positives, second cycle, the default recommendation is retire.
        Copy tweaks rarely save a weak signal. Re-pick the signal or the persona before
        rewriting the message.
      </Callout>
    </Stack>
  );
}

function SubjectExample({
  label,
  example,
  tone,
}: {
  label: string;
  example: string;
  tone?: "fail";
}) {
  const theme = useHostTheme();
  return (
    <Stack gap={1}>
      <Text style={{ fontSize: 11, color: theme.text.tertiary, fontWeight: 590 }}>
        {label.toUpperCase()}
      </Text>
      <Text
        style={{
          fontSize: 12,
          color: tone === "fail" ? theme.text.tertiary : theme.text.secondary,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        }}
      >
        {example}
      </Text>
    </Stack>
  );
}

function AlternativeStackSection() {
  return (
    <Stack gap={16}>
      <Stack gap={4}>
        <H2>What you can replace from the standard stack</H2>
        <Text style={{ fontSize: 14 }}>
          The plugin is a working alternative to the SaaS outbound stack until you're past
          the point of needing it. Each layer here maps to a skill or script you can read
          and modify in an afternoon.
        </Text>
      </Stack>

      <Table
        headers={["Job to do", "Enterprise tool", "What you use instead", "Skill"]}
        rows={[
          [
            <Text>Contact data and enrichment</Text>,
            <Text>Apollo + Clay</Text>,
            <Text>LinkedIn search, Hunter.io free tier, xmcp, and an email-pattern guesser</Text>,
            <Code>gtm-find-prospects</Code>,
          ],
          [
            <Text>LinkedIn outbound</Text>,
            <Text>Amplemarket or Outreach</Text>,
            <Text>Lemlist or manual copy-paste</Text>,
            <Code>gtm-linkedin-outreach</Code>,
          ],
          [
            <Text>Cold email infrastructure</Text>,
            <Text>Salesloft or Outreach</Text>,
            <Text>Google Workspace + Gmail API + Smartlead's free warmup tier</Text>,
            <Code>gtm-cold-email</Code>,
          ],
          [
            <Text>X / Twitter DMs</Text>,
            <Text>No enterprise equivalent</Text>,
            <Text>Local xmcp + X API Basic tier or free tier for low volume</Text>,
            <Code>gtm-x-outreach</Code>,
          ],
          [
            <Text>Buying signals (funding, hires, ships)</Text>,
            <Text>Crunchbase Pro + ZoomInfo</Text>,
            <Text>TechCrunch RSS, Crunchbase free, Show HN, Product Hunt, LinkedIn job-change filter</Text>,
            <Code>gtm-find-prospects</Code>,
          ],
          [
            <Text>Title filtering</Text>,
            <Text>Custom enrichment + ML scoring</Text>,
            <Text>A keyword list with an exclusion regex, in 200 lines of Python you can edit</Text>,
            <Code>title-classifier.py</Code>,
          ],
          [
            <Text>Sequencing and reply detection</Text>,
            <Text>Outreach.io or Salesloft</Text>,
            <Text>JSONL logs and a state machine in gtm-cold-email that cancels pending touches on reply</Text>,
            <Code>gtm-cold-email</Code>,
          ],
          [
            <Text>Performance analytics</Text>,
            <Text>HockeyStack, Gong + a data team</Text>,
            <Text>gtm-get-better reads your logs, classifies replies, retires losing plays at N ≥ 15</Text>,
            <Code>gtm-get-better</Code>,
          ],
          [
            <Text>Voice and copy quality</Text>,
            <Text>An SDR team and a copywriter</Text>,
            <Text>The voice samples you fed gtm-sales-pack, applied via the always-on voice rule</Text>,
            <Code>gtm-sales-pack</Code>,
          ],
          [
            <Text>Scheduling and triggers</Text>,
            <Text>Workflow automation platforms</Text>,
            <Text>Five Cursor Automations: weekly gtm-get-better, daily follow-ups, post-campaign debrief, positive-reply ping, trial-expiry sweep</Text>,
            <Code>automations/*</Code>,
          ],
        ]}
      />
    </Stack>
  );
}

function SkillsSection() {
  return (
    <Stack gap={16}>
      <Stack gap={4}>
        <H2>The ten skills</H2>
        <Text style={{ fontSize: 14 }}>
          You trigger each one with a slash command in chat. The skills are loosely coupled,
          but the dependencies below are real. gtm-sales-pack has to exist before any channel
          skill will draft for you.
        </Text>
      </Stack>

      <Table
        headers={["Skill", "When", "What it does", "Depends on"]}
        rows={[
          [
            <Code>/gtm-setup</Code>,
            <Text>First install</Text>,
            <Text>Walks you through setup in the right order. Picks channels, runs prereqs.</Text>,
            <Text>Nothing</Text>,
          ],
          [
            <Code>/gtm-playbook</Code>,
            <Text>To open the guide</Text>,
            <Text>Opens this visual playbook and gives a short orientation before setup.</Text>,
            <Text>Nothing</Text>,
          ],
          [
            <Code>/gtm-sales-pack</Code>,
            <Text>Before any outreach</Text>,
            <Text>
              Interviews you (about 25 questions, one at a time) about company, ICP, value
              props, objections, voice. Writes sales-pack.md.
            </Text>,
            <Text>Nothing</Text>,
          ],
          [
            <Code>/gtm-find-prospects</Code>,
            <Text>To build a target list</Text>,
            <Text>
              Asks what tools you have. Combines free and paid sources. Runs a title
              classifier with exclusions. Outputs a ranked CSV in person or account mode.
            </Text>,
            <Code>sales-pack.md</Code>,
          ],
          [
            <Code>/gtm-design-play</Code>,
            <Text>To codify what worked</Text>,
            <Text>
              Designs a single outbound play: signal, persona, channel, 4-touch cadence,
              offer ladder. Writes plays/{"{name}"}.md.
            </Text>,
            <Code>sales-pack.md</Code>,
          ],
          [
            <Code>/gtm-x-outreach</Code>,
            <Text>To run X DMs</Text>,
            <Text>
              Pulls each target's last 10 to 20 posts via xmcp, finds a hook, drafts the DM
              in your voice, sends or saves to drafts.
            </Text>,
            <Text>gtm-sales-pack + xmcp + prospect list</Text>,
          ],
          [
            <Code>/gtm-linkedin-outreach</Code>,
            <Text>To run LinkedIn outreach</Text>,
            <Text>
              Drafts connection notes under 250 characters. Sends via Lemlist, Amplemarket,
              LGM, or manual.
            </Text>,
            <Text>gtm-sales-pack + LinkedIn tool + prospect list</Text>,
          ],
          [
            <Code>/gtm-cold-email</Code>,
            <Text>To run cold email</Text>,
            <Text>
              Drafts 4-step sequences. Sends via Gmail API with a daily cap, or saves as
              Gmail Drafts. Reply state machine cancels follow-ups when someone replies.
            </Text>,
            <Text>gtm-sales-pack + Gmail OAuth + prospect list</Text>,
          ],
          [
            <Code>/gtm-warm-intro</Code>,
            <Text>For 5 to 10x conversion vs cold</Text>,
            <Text>
              Reads your LinkedIn connections CSV, matches bridges per prospect, drafts the
              intro request plus a forwardable blurb for the bridge to paste.
            </Text>,
            <Text>gtm-sales-pack + connections.csv + prospect list</Text>,
          ],
          [
            <Code>/gtm-get-better</Code>,
            <Text>Weekly</Text>,
            <Text>
              Reads logs. Classifies first replies on the rubric. Slices metrics per play
              and per touch. Retires losing plays at N ≥ 15. Proposes edits to the skill
              files themselves when a pattern wins consistently.
            </Text>,
            <Text>At least one campaign run</Text>,
          ],
        ]}
      />
    </Stack>
  );
}

function RecommendedSequence() {
  const theme = useHostTheme();
  return (
    <Stack gap={16}>
      <Stack gap={4}>
        <H2>The recommended sequence</H2>
        <Text style={{ fontSize: 14 }}>
          If you do nothing else, do this in this order. Don't skip the sales pack. It is
          the single biggest determinant of whether your messages sound like you or like a
          bot.
        </Text>
      </Stack>

      <Stack gap={10}>
        <SequenceRow
          when="Day 1 morning, 30 min"
          run="/gtm-sales-pack"
          why="The knowledge base every other skill reads. Without it, every draft sounds like a bot."
        />
        <SequenceRow
          when="Day 1 morning, 15 min"
          run="/gtm-setup"
          why="Pick which channels to run. Walk through their setup. Stop after one is configured."
        />
        <SequenceRow
          when="Day 1 mid-day, 45 min"
          run="/gtm-find-prospects"
          why="Build your first target list. Cap at 25 to 50 prospects for calibration."
        />
        <SequenceRow
          when="Day 1 afternoon"
          run="/gtm-x-outreach, /gtm-linkedin-outreach, or /gtm-cold-email"
          why="Hand-walk the first 5 messages. Adjust the sales pack if drafts feel off. Then batch the rest under the daily cap."
        />
        <SequenceRow
          when="Day 2 morning"
          run="Wire the automations/ specs"
          why="Five Cursor Automations: daily follow-ups, weekly gtm-get-better, post-campaign debrief, positive-reply ping, trial-expiry sweep. Now the rhythm runs without you remembering."
        />
        <SequenceRow
          when="Day 2 afternoon"
          run="/gtm-design-play"
          why="As replies come in, codify what worked into a named, repeatable play. Now you have something to scale."
        />
      </Stack>

      <Callout
        tone="warning"
        title="The first 5 messages on every channel are calibration, not volume"
      >
        Founders who blast 200 messages on day 1 always regret it. The first batch is for
        feeling the quality bar. After you've seen 5 replies (positive, negative, or none),
        scale to 25 per day. Two weeks later, scale to the channel's safe ceiling. From
        there the automations carry the recurring rhythm and gtm-get-better runs your
        weekly learning loop.
      </Callout>

      <div
        style={{
          padding: 14,
          borderLeft: `2px solid ${theme.accent.primary}`,
          background: theme.fill.tertiary,
        }}
      >
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>
          The reason this is a set of markdown files instead of a hosted SaaS: when
          something isn't working, you open the skill and change it. You tune the title
          classifier. You add a signal source. You rewrite the voice rule. The system that
          messages your prospects is one you can read and modify in an afternoon.
        </Text>
      </div>
    </Stack>
  );
}

function SequenceRow({
  when,
  run,
  why,
}: {
  when: string;
  run: string;
  why: string;
}) {
  const theme = useHostTheme();
  return (
    <Row gap={16} align="start">
      <div style={{ minWidth: 130 }}>
        <Text style={{ fontSize: 12, color: theme.text.tertiary, fontWeight: 590 }}>
          {when.toUpperCase()}
        </Text>
      </div>
      <div style={{ minWidth: 220 }}>
        <Code>{run}</Code>
      </div>
      <Text style={{ fontSize: 13, color: theme.text.secondary, flex: 1 }}>{why}</Text>
    </Row>
  );
}

function ResourcesFooter() {
  return (
    <Stack gap={12}>
      <H2>What to read next</H2>
      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader>What's in the package</CardHeader>
          <CardBody>
            <Stack gap={6}>
              <Text style={{ fontSize: 13, color: useHostTheme().text.tertiary }}>
                Installs from the team marketplace, with files under the Founder GTM plugin root.
              </Text>
              <Text style={{ fontSize: 13 }}>
                <Code>skills/</Code>: ten gtm-prefixed skills you invoke as slash
                commands. Start with <Code>/gtm-setup</Code>.
              </Text>
              <Text style={{ fontSize: 13 }}>
                <Code>skills/gtm-design-play/plays/</Code>: three starter plays you fork
                instead of designing from scratch (seed fundraisers, Show HN launches,
                eng-leader job changes).
              </Text>
              <Text style={{ fontSize: 13 }}>
                <Code>rules/gtm-voice-guide.mdc</Code>: always-on voice rule. Strips em
                dashes, AI clichés, and signposting from every draft.
              </Text>
              <Text style={{ fontSize: 13 }}>
                <Code>automations/</Code>: five Cursor Automation specs you create once
                (Day 2 morning of the sequence above).
              </Text>
              <Text style={{ fontSize: 13 }}>
                <Code>skills/gtm-find-prospects/scripts/</Code>: five small scrapers
                (TechCrunch funding RSS, Show HN, xmcp topic search, domain histogram, title
                classifier) plus tunable data files in <Code>data/</Code>.
              </Text>
              <Text style={{ fontSize: 13 }}>
                <Code>hooks/</Code>: sessionStart hook that greets new founders in any
                project without a sales-pack yet, plus an afterFileEdit hook that scans
                drafts under <Code>outreach-log/</Code> for AI tells before you send.
              </Text>
              <Text style={{ fontSize: 13 }}>
                <Code>README.md</Code>, <Code>CHANGELOG.md</Code>, <Code>resources.md</Code>:
                install path, version history, and the curated reading list.
              </Text>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>External reading</CardHeader>
          <CardBody>
            <Stack gap={6}>
              <Text style={{ fontSize: 13 }}>
                <Link href="https://www.foundingsales.com">Founder-Led Sales</Link> by Pete
                Kazanjy. First three chapters are free. The canonical text for this stage.
              </Text>
              <Text style={{ fontSize: 13 }}>
                <Link href="https://www.lavender.ai/learn">
                  Lavender's Cold Email Playbook
                </Link>
                . The most data-driven writing guide anywhere.
              </Text>
              <Text style={{ fontSize: 13 }}>
                <Link href="https://www.mkt1.co">MKT1 newsletter</Link> by Emily Kramer.
                Rigor that most GTM writing lacks.
              </Text>
              <Text style={{ fontSize: 13 }}>
                <Link href="https://www.smartlead.ai/academy">Smartlead Academy</Link>. Free
                course on cold-email deliverability infrastructure. Read it before sending
                from a new domain.
              </Text>
              <Text style={{ fontSize: 13 }}>
                <Link href="https://www.lennysnewsletter.com">Lenny's Newsletter</Link>{" "}
                under the outbound and sales tags.
              </Text>
              <Text style={{ fontSize: 13 }}>
                <Link href="https://github.com/blader/humanizer">blader/humanizer</Link>
                {" "}is the source of the anti-AI-writing patterns baked into the voice rule.
              </Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Callout tone="success" title="Start now">
        Open chat. Type <Code>/gtm-setup</Code>. The orchestrator walks you through the
        first 30 minutes. If you haven't built a sales pack yet, that's where it sends you
        first.
      </Callout>
    </Stack>
  );
}
