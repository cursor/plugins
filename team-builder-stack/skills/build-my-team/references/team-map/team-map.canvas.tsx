// The team map: a Grok Bot canvas built from the team spec. build_team_map.py fills the data block below
// from the spec and the skills it names; everything else in this file is the map's layout, kept only here.
// Three levels: the team, one bot or bot blueprint, and one skill with its steps. When the data carries a
// proposal, the map shows the proposed team, and a switch shows the current one beside it.
import { Button, Divider, Grid, H1, H2, H3, Pill, Row, Stack, Text, useHostTheme, useState } from 'cursor/canvas'

type Change = 'added' | 'changed' | 'removed'
interface Marked {
  change?: Change
  /** For a changed item: what it was, one line per field */
  was?: string[]
}
interface MapStep extends Marked {
  name: string
  does: string
  uses: string[]
  template: string
  review: string
}
interface MapSkill extends Marked {
  id: string
  name: string
  description: string
  source: 'plugin' | 'library' | 'not found'
  templateLocation: string
  templateOwner: string
  load: string
  verify: string
  record: string
  handOff: string
  steps: MapStep[]
}
interface MapBot extends Marked {
  id: string
  name: string
  /** True for an entry the spec hasn't filled in yet */
  blank: boolean
  type: string
  blueprint: boolean
  modelBot: string
  botTemplate: string
  skills: string[]
  systems: string[]
}
interface MapHandoff extends Marked {
  from: string
  to: string
  what: string
  how: string
}
interface MapSystem extends Marked {
  name: string
  blank: boolean
  connector: string
  holds: string
  uniqueId: string
  recordFor: string
}
interface MapBody {
  spec: { version: string; date: string; changeLog: string }
  role: { role: string; outcomes: string; unit: string; howMany: string; timeZone: string }
  voiceSkill: string
  /** The bot that checks work when a bot can't start a fresh checker itself */
  verifier: string
  /** In a proposal, who verified before, when that changes */
  verifierWas?: string
  bots: MapBot[]
  skills: MapSkill[]
  handoffs: MapHandoff[]
  systems: MapSystem[]
}
interface TeamMap {
  /** Set while the person decides: what changes, and the spec version it changes, or empty for a new team */
  proposal: { summary: string; against: string } | null
  now: MapBody
  /** The current team, when the proposal changes one */
  before: MapBody | null
}

const MAP: TeamMap = /* TEAM_MAP_DATA_START */ {
  proposal: null,
  now: {
    spec: { version: '', date: '', changeLog: '' },
    role: { role: '', outcomes: '', unit: '', howMany: '', timeZone: '' },
    voiceSkill: '',
    verifier: '',
    bots: [],
    skills: [],
    handoffs: [],
    systems: [],
  },
  before: null,
} /* TEAM_MAP_DATA_END */

/** Anything a component can hold, typed from the SDK so the canvas imports nothing else. */
type Children = Parameters<typeof Stack>[0]['children']

type Place = { level: 'team' } | { level: 'bot'; bot: string } | { level: 'skill'; bot: string; skill: string }

const TYPE_LABEL: Record<string, string> = { builder: 'Builder', manager: 'Manager', owner: 'Owner', specialist: 'Specialist' }
const CHANGE_LABEL: Record<Change, string> = { added: 'Added', changed: 'Changed', removed: 'Removed' }
const CHANGE_TONE: Record<Change, 'added' | 'renamed' | 'deleted'> = { added: 'added', changed: 'renamed', removed: 'deleted' }
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function Value({ text, slot }: { text: string; slot: string }) {
  return text ? <Text>{text}</Text> : <Text tone="quaternary" italic>{`To fill in: ${slot}`}</Text>
}

function Mark({ item, showChanges }: { item: Marked; showChanges: boolean }) {
  if (!showChanges || !item.change) return null
  return (
    <Pill size="sm" tone={CHANGE_TONE[item.change]}>
      {CHANGE_LABEL[item.change]}
    </Pill>
  )
}

function Was({ item, showChanges }: { item: Marked; showChanges: boolean }) {
  if (!showChanges || item.change !== 'changed' || !item.was?.length) return null
  return (
    <Stack gap={2}>
      {item.was.map((w) => (
        <Text key={w} size="small" tone="tertiary">{`Was: ${w}`}</Text>
      ))}
    </Stack>
  )
}

function Tile({ item, onOpen, children }: { item: Marked & { blank?: boolean }; onOpen?: () => void; children: Children }) {
  const theme = useHostTheme()
  const removed = item.change === 'removed'
  return (
    <div
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' && onOpen ? onOpen() : undefined)}
      style={{
        border: `1px ${item.blank ? 'dashed' : 'solid'} ${theme.stroke.secondary}`,
        borderRadius: 10,
        padding: 14,
        background: item.blank ? 'transparent' : theme.bg.elevated,
        cursor: onOpen ? 'pointer' : 'default',
        opacity: removed ? 0.6 : 1,
        textDecoration: removed ? 'line-through' : 'none',
      }}
    >
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: Children }) {
  return (
    <Stack gap={2}>
      <Text size="small" tone="tertiary">
        {label}
      </Text>
      {children}
    </Stack>
  )
}

function Crumbs({ parts, go }: { parts: { label: string; to?: Place }[]; go: (p: Place) => void }) {
  return (
    <Row gap={6} wrap>
      {parts.map((p, i) => (
        <Row key={p.label} gap={6}>
          {i > 0 && <Text tone="quaternary">/</Text>}
          {p.to ? (
            <Button variant="ghost" onClick={() => go(p.to!)}>
              {p.label}
            </Button>
          ) : (
            <Text weight="semibold">{p.label}</Text>
          )}
        </Row>
      ))}
    </Row>
  )
}

function BotTile({ bot, body, showChanges, go }: { bot: MapBot; body: MapBody; showChanges: boolean; go: (p: Place) => void }) {
  const skills = bot.skills.map((id) => body.skills.find((s) => s.id === id)).filter((s): s is MapSkill => !!s)
  const reviews = skills.reduce((n, s) => n + s.steps.filter((st) => st.review).length, 0)
  return (
    <Tile item={bot} onOpen={bot.blank ? undefined : () => go({ level: 'bot', bot: bot.id })}>
      <Stack gap={8}>
        <Row gap={6} wrap>
          <Pill size="sm">{TYPE_LABEL[bot.type] ?? 'Type to fill in'}</Pill>
          {bot.blueprint && (
            <Pill size="sm" tone="info">
              Bot blueprint
            </Pill>
          )}
          {body.verifier === bot.id && <Pill size="sm">Verifies</Pill>}
          <Mark item={bot} showChanges={showChanges} />
        </Row>
        <H3>{bot.name}</H3>
        <Text size="small" tone="secondary">
          {bot.blank
            ? 'One block in Your team. Every unit of this kind gets a bot built from its bot template.'
            : `${plural(skills.length, 'skill')} · ${plural(bot.systems.length, 'system')} · ${plural(reviews, 'review')}`}
        </Text>
        <Was item={bot} showChanges={showChanges} />
      </Stack>
    </Tile>
  )
}

function TeamLevel({ body, showChanges, go }: { body: MapBody; showChanges: boolean; go: (p: Place) => void }) {
  const theme = useHostTheme()
  const isUnit = (b: MapBot) => b.blank || b.blueprint || b.type === 'owner'
  const runs = body.bots.filter((b) => !isUnit(b))
  const units = body.bots.filter(isUnit)
  const name = (id: string) => body.bots.find((b) => b.id === id)?.name ?? id
  return (
    <Stack gap={24}>
      <Stack gap={8}>
        <Text size="small" tone="tertiary">
          Team
        </Text>
        <H1>Your team</H1>
        <Grid columns="repeat(auto-fit, minmax(180px, 1fr))" gap={12}>
          <Field label="Role">
            <Value text={body.role.role} slot="your role" />
          </Field>
          <Field label="Business outcomes and KPIs">
            <Value text={body.role.outcomes} slot="what you drive, and how it's measured" />
          </Field>
          <Field label="Unit of work">
            <Value text={[body.role.unit, body.role.howMany].filter(Boolean).join(', ')} slot="what you manage, and how many" />
          </Field>
          <Field label="Home time zone">
            <Value text={body.role.timeZone} slot="your home time zone" />
          </Field>
        </Grid>
      </Stack>
      <Stack gap={12}>
        <H2>Runs the team</H2>
        <Field label="Who verifies, when a bot can't start a fresh checker">
          <Row gap={6} wrap>
            <Value text={body.verifier ? name(body.verifier) : ''} slot="a specialist or manager bot" />
            {showChanges && body.verifierWas && (
              <Pill size="sm" tone="renamed">
                Changed
              </Pill>
            )}
          </Row>
          {showChanges && body.verifierWas && <Text size="small" tone="tertiary">{`Was: ${body.verifierWas}`}</Text>}
        </Field>
        <Grid columns="repeat(auto-fill, minmax(240px, 1fr))" gap={12}>
          {runs.map((b) => (
            <BotTile key={b.id} bot={b} body={body} showChanges={showChanges} go={go} />
          ))}
        </Grid>
      </Stack>
      <Stack gap={12}>
        <H2>One blueprint for each kind of unit</H2>
        <Text tone="secondary">The first bot of each kind that works, the model bot, exports itself as the bot template, and each next unit's bot is built from it.</Text>
        <Grid columns="repeat(auto-fill, minmax(240px, 1fr))" gap={12}>
          {units.map((b) => (
            <BotTile key={b.id} bot={b} body={body} showChanges={showChanges} go={go} />
          ))}
        </Grid>
      </Stack>
      {body.handoffs.length > 0 && (
        <Stack gap={12}>
          <H2>How they hand off</H2>
          <Stack gap={0}>
            {body.handoffs.map((h) => (
              <div key={`${h.from}|${h.to}|${h.what}`} style={{ borderTop: `1px solid ${theme.stroke.tertiary}`, padding: '10px 0', textDecoration: h.change === 'removed' ? 'line-through' : 'none' }}>
                <Row gap={10} wrap>
                  <Text weight="semibold">{`${name(h.from)} to ${name(h.to)}`}</Text>
                  <Text tone="secondary">{h.what}</Text>
                  {h.how && (
                    <Text size="small" tone="tertiary">
                      {h.how}
                    </Text>
                  )}
                  <Mark item={h} showChanges={showChanges} />
                </Row>
                <Was item={h} showChanges={showChanges} />
              </div>
            ))}
          </Stack>
        </Stack>
      )}
      <Stack gap={12}>
        <H2>Systems of record</H2>
        <Grid columns="repeat(auto-fill, minmax(240px, 1fr))" gap={12}>
          {body.systems.map((s) => (
            <Tile key={s.name} item={s}>
              <Stack gap={6}>
                <Row gap={6} wrap>
                  <Text weight="semibold">{s.name}</Text>
                  <Mark item={s} showChanges={showChanges} />
                </Row>
                <Field label="Connector">
                  <Value text={s.connector} slot="its connector" />
                </Field>
                <Field label="Unique ID for one unit">
                  <Value text={s.uniqueId} slot="what finds one unit" />
                </Field>
                <Field label="System of record for">
                  <Value text={s.recordFor} slot="the facts it settles" />
                </Field>
                <Was item={s} showChanges={showChanges} />
              </Stack>
            </Tile>
          ))}
        </Grid>
      </Stack>
    </Stack>
  )
}

function BotLevel({ body, bot, showChanges, go }: { body: MapBody; bot: MapBot; showChanges: boolean; go: (p: Place) => void }) {
  const theme = useHostTheme()
  const mine = body.handoffs.filter((h) => h.from === bot.id || h.to === bot.id)
  const name = (id: string) => body.bots.find((b) => b.id === id)?.name ?? id
  return (
    <Stack gap={24}>
      <Crumbs parts={[{ label: 'Team', to: { level: 'team' } }, { label: bot.name }]} go={go} />
      <Stack gap={8}>
        <Row gap={6} wrap>
          <Pill size="sm">{TYPE_LABEL[bot.type] ?? 'Type to fill in'}</Pill>
          {bot.blueprint && (
            <Pill size="sm" tone="info">
              Bot blueprint
            </Pill>
          )}
          <Mark item={bot} showChanges={showChanges} />
        </Row>
        <H1>{bot.name}</H1>
        <Was item={bot} showChanges={showChanges} />
      </Stack>
      {bot.blueprint && (
        <Grid columns="repeat(auto-fit, minmax(220px, 1fr))" gap={12}>
          <Field label="Model bot">
            <Value text={bot.modelBot} slot="the first bot of this kind that works" />
          </Field>
          <Field label="Bot template">
            <Value text={bot.botTemplate} slot="the link the model bot exported" />
          </Field>
        </Grid>
      )}
      <Stack gap={12}>
        <H2>Skills</H2>
        <Stack gap={8}>
          {bot.skills.map((id) => {
            const s = body.skills.find((x) => x.id === id)
            if (!s) return null
            return (
              <Tile key={id} item={s} onOpen={() => go({ level: 'skill', bot: bot.id, skill: id })}>
                <Row gap={10} justify="space-between" wrap>
                  <Stack gap={2} style={{ flex: 1, minWidth: 200 }}>
                    <Text weight="semibold">{s.name}</Text>
                    <Text size="small" tone="secondary">
                      {s.description || (s.source === 'not found' ? 'Not found in the skill library yet.' : '')}
                    </Text>
                  </Stack>
                  <Row gap={6}>
                    {s.steps.length > 0 && <Pill size="sm">{plural(s.steps.length, 'step')}</Pill>}
                    {s.steps.some((st) => st.review) && (
                      <Pill size="sm" tone="info">
                        {plural(s.steps.filter((st) => st.review).length, 'review')}
                      </Pill>
                    )}
                    <Pill size="sm">{s.source === 'plugin' ? 'Team Builder Stack' : s.source === 'library' ? 'Your library' : 'Not found'}</Pill>
                    <Mark item={s} showChanges={showChanges} />
                  </Row>
                </Row>
              </Tile>
            )
          })}
        </Stack>
      </Stack>
      <Grid columns="repeat(auto-fit, minmax(260px, 1fr))" gap={24}>
        <Stack gap={12}>
          <H2>Systems its skills use</H2>
          {bot.systems.length ? (
            <Row gap={6} wrap>
              {bot.systems.map((s) => (
                <Pill key={s} size="sm">
                  {s}
                </Pill>
              ))}
            </Row>
          ) : (
            <Text tone="tertiary">Worked out from its skills' steps once they're written.</Text>
          )}
        </Stack>
        <Stack gap={12}>
          <H2>Handoffs</H2>
          {mine.length ? (
            <Stack gap={0}>
              {mine.map((h) => (
                <div key={`${h.from}|${h.to}|${h.what}`} style={{ borderTop: `1px solid ${theme.stroke.tertiary}`, padding: '8px 0' }}>
                  <Stack gap={2}>
                    <Row gap={6} wrap>
                      <Text weight="semibold">{`${name(h.from)} to ${name(h.to)}`}</Text>
                      <Mark item={h} showChanges={showChanges} />
                    </Row>
                    <Text size="small" tone="secondary">
                      {h.what}
                    </Text>
                  </Stack>
                </div>
              ))}
            </Stack>
          ) : (
            <Text tone="tertiary">None yet.</Text>
          )}
        </Stack>
      </Grid>
    </Stack>
  )
}

function StepRow({ step, n, showChanges }: { step: MapStep; n: number; showChanges: boolean }) {
  const theme = useHostTheme()
  return (
    <div
      style={{
        border: `1px solid ${theme.stroke.secondary}`,
        borderLeft: `3px solid ${step.review ? theme.accent.primary : theme.stroke.secondary}`,
        borderRadius: 10,
        padding: 14,
        background: theme.bg.elevated,
        textDecoration: step.change === 'removed' ? 'line-through' : 'none',
      }}
    >
      <Stack gap={10}>
        <Row gap={8} wrap>
          <Text tone="tertiary">{String(n)}</Text>
          <Text weight="semibold">{step.name}</Text>
          {step.review && (
            <Pill size="sm" tone="info">
              Your review
            </Pill>
          )}
          <Mark item={step} showChanges={showChanges} />
        </Row>
        {step.does && <Text tone="secondary">{step.does}</Text>}
        <Grid columns="repeat(auto-fit, minmax(160px, 1fr))" gap={12}>
          <Field label="Uses">
            <Text>{step.uses.length ? step.uses.join(', ') : 'Nothing new'}</Text>
          </Field>
          <Field label="Template">
            <Text>{step.template || 'None'}</Text>
          </Field>
          <Field label="Your review">
            <Text>{step.review || 'Runs on its own'}</Text>
          </Field>
        </Grid>
        <Was item={step} showChanges={showChanges} />
      </Stack>
    </div>
  )
}

function SkillLevel({ bot, skill, showChanges, go }: { bot: MapBot; skill: MapSkill; showChanges: boolean; go: (p: Place) => void }) {
  const fixed = [
    { n: 1, title: 'Load', text: skill.load },
    { n: 3, title: 'Verify', text: skill.verify },
    { n: 4, title: 'Record', text: skill.record },
    { n: 5, title: 'Hand off', text: skill.handOff },
  ]
  const phase = (p: { n: number; title: string; text: string }) => (
    <Grid key={p.title} columns="140px 1fr" gap={16}>
      <Stack gap={2}>
        <Text tone="quaternary">{String(p.n)}</Text>
        <Text weight="semibold">{p.title}</Text>
      </Stack>
      <Text tone="secondary">{p.text}</Text>
    </Grid>
  )
  return (
    <Stack gap={24}>
      <Crumbs parts={[{ label: 'Team', to: { level: 'team' } }, { label: bot.name, to: { level: 'bot', bot: bot.id } }, { label: skill.name }]} go={go} />
      <Stack gap={8}>
        <Row gap={6} wrap>
          <Pill size="sm">{skill.source === 'plugin' ? 'Team Builder Stack' : skill.source === 'library' ? 'Your library' : 'Not found'}</Pill>
          <Mark item={skill} showChanges={showChanges} />
        </Row>
        <H1>{skill.name}</H1>
        {skill.description && <Text tone="secondary">{skill.description}</Text>}
        <Was item={skill} showChanges={showChanges} />
      </Stack>
      {skill.source !== 'library' || skill.steps.length === 0 ? (
        <Text tone="tertiary">
          {skill.source === 'plugin'
            ? 'It comes with the Team Builder Stack plugin, so its steps live in the plugin and the spec only names it.'
            : skill.source === 'library'
              ? 'A shared skill in your library, such as the writing voice or a guideline. The spec only names it.'
              : 'The spec names this skill, but it isn’t in the skill library yet. Write a workflow skill writes it.'}
        </Text>
      ) : (
        <Stack gap={16}>
          <Grid columns="repeat(auto-fit, minmax(220px, 1fr))" gap={12}>
            <Field label="Template, where it lives">
              <Value text={skill.templateLocation} slot="in the skill, a Grok Bot document or canvas id, or a link and its connector" />
            </Field>
            {skill.templateOwner && (
              <Field label="Template owner">
                <Text>{skill.templateOwner}</Text>
              </Field>
            )}
            <Field label="Waits for your review at">
              <Text>{skill.steps.filter((s) => s.review).map((s) => s.name).join(', ') || 'No step'}</Text>
            </Field>
          </Grid>
          <Divider />
          {phase(fixed[0])}
          <Grid columns="140px 1fr" gap={16}>
            <Stack gap={2}>
              <Text tone="quaternary">2</Text>
              <Text weight="semibold">Do the work</Text>
              <Text size="small" tone="tertiary">
                Your own named steps
              </Text>
            </Stack>
            <Stack gap={8}>
              {skill.steps.map((st, i) => (
                <StepRow key={st.name} step={st} n={i + 1} showChanges={showChanges} />
              ))}
            </Stack>
          </Grid>
          {fixed.slice(1).map(phase)}
        </Stack>
      )}
    </Stack>
  )
}

export default function TeamMapCanvas() {
  const theme = useHostTheme()
  const [place, setPlace] = useState<Place>({ level: 'team' })
  const [showCurrent, setShowCurrent] = useState(false)
  const body = showCurrent && MAP.before ? MAP.before : MAP.now
  const showChanges = !!MAP.proposal && !showCurrent && !!MAP.before
  const bot = place.level !== 'team' ? body.bots.find((b) => b.id === place.bot) : undefined
  const skill = place.level === 'skill' ? body.skills.find((s) => s.id === place.skill) : undefined
  const go = (p: Place) => setPlace(p)
  return (
    <Stack gap={20} style={{ padding: 24, maxWidth: 1120, margin: '0 auto' }}>
      {MAP.proposal && (
        <div style={{ border: `1px solid ${theme.accent.primary}`, borderRadius: 10, padding: 14 }}>
          <Row gap={12} justify="space-between" wrap>
            <Stack gap={4} style={{ flex: 1, minWidth: 260 }}>
              <Text weight="semibold">{MAP.before ? (showCurrent ? 'Current team' : 'Proposed change') : 'Proposed team'}</Text>
              <Text tone="secondary">{`${MAP.proposal.summary} Nothing changes until you say yes.`}</Text>
            </Stack>
            {MAP.before && (
              <Row gap={6}>
                <Pill active={!showCurrent} onClick={() => setShowCurrent(false)}>
                  Proposed
                </Pill>
                <Pill active={showCurrent} onClick={() => setShowCurrent(true)}>
                  Current
                </Pill>
              </Row>
            )}
          </Row>
        </div>
      )}
      {place.level === 'skill' && bot && skill ? (
        <SkillLevel bot={bot} skill={skill} showChanges={showChanges} go={go} />
      ) : place.level !== 'team' && bot ? (
        <BotLevel body={body} bot={bot} showChanges={showChanges} go={go} />
      ) : (
        <TeamLevel body={body} showChanges={showChanges} go={go} />
      )}
      <Divider />
      <Text size="small" tone="tertiary">
        {`Built from the team spec${body.spec.version ? `, version ${body.spec.version}` : ''}${body.spec.date ? `, ${body.spec.date}` : ''}. The map is rebuilt from the spec after each change, and never edited by hand.`}
      </Text>
    </Stack>
  )
}
