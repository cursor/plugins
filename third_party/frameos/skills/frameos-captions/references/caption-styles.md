# Caption styles, fonts, animations and appearance

The full catalogue the FrameOS caption renderer accepts. No tool lists the styles, so use only the ids on this page. Show users the display names, not the ids.

## How style ids work

- Send ids in lowercase with hyphens, exactly as written below. The server lowercases and treats underscores as hyphens.
- Aliases the server accepts: `default`, `shorts-default` and `float` mean `karaoke`; `bounce` means `beasty`; `type` means `deep-diver`. A clip's `captionStyle` can show an alias - new clips usually show the shorts-default alias, sometimes written with an underscore. Read every alias as its canonical style.
- Any other value is rejected with "Unknown caption style" by `set_caption_style`, `recaption_clip` and `export_clip`. `recaption_clip` answers with the canonical id it will burn.
- Every style shows at most 3 words at a time in short chunks. Words per chunk cannot be changed.
- Captions follow the speech timing of the clip. A clip with no speech has nothing to caption.

## The 22 styles plus "none"

Look = the category the FrameOS web app files the style under. Case = how the words are written in the burned captions.

| id | Name | Look | Case | Default font | Default animation | What it looks like |
|---|---|---|---|---|---|---|
| `karaoke` | Karaoke (the default) | bold | CAPS | Montserrat | word-level_karaoke_fill-pop | White heavy text, black outline; the active word turns green and pops |
| `beasty` | Beasty | bold | CAPS | Luckiest Guy | pop | Comic-style white text, thick black outline; the active word turns green and pops |
| `deep-diver` | Deep Diver | boxed | Sentence | Poppins | deep-diver | Grey text on a light-grey box; the active word's box turns black, other words dimmed |
| `youshaei` | Youshaei | clean | CAPS | Roboto | deep-diver | Large grey text, no outline; the active word turns mint green, other words dimmed |
| `pod-p` | Pod P | bold | CAPS | Archivo | word-level_karaoke_fill-pop | The biggest text in the set, pink with a black outline; the active word turns green |
| `mozi` | Mozi | bold | CAPS | Montserrat | scale | White heavy text, thick black outline; the active word turns green and grows |
| `popline` | Popline | boxed | CAPS | Spline Sans | word-level_karaoke_bg-highlight | White text; the active word turns purple on a dark highlight box |
| `glitch-infinite` | Glitch Infinite | fun | Sentence | Poppins | glitch-infinite-zoom | Amber text, no outline, with a quick pulsing zoom |
| `seamless-bounce` | Seamless Bounce | boxed | Sentence | Poppins | seamless-bounce | White text in a thick dark-green outline; the active word turns lime; each phrase bounces in |
| `baby-earthquake` | Baby Earthquake | fun | Sentence | Marcellus | baby-earthquake | White serif text, black outline; the active word turns yellow; a constant small shake |
| `blur-switch` | Blur Switch | clean | CAPS | Roboto | blur-switch | White text, no outline; the active word turns cyan and stays sharp while the others blur |
| `highlighter-box` | Highlighter Box | boxed | Sentence | Anton | word-level_simple_bg-highlight | Tall condensed white text; the active word turns blue on a pink highlight box |
| `simple` | Simple | clean | CAPS | Bebas Neue | word-level_karaoke_fill-pop | Tall condensed white text, black outline; the active word turns green with a small pop |
| `think-media` | Think Media | bold | CAPS | Oswald | pop | Italic condensed white text, thin black outline; the active word turns green and pops |
| `focus` | Focus | bold | CAPS | Roboto Mono | individual-focus | Monospace white text, black outline; the active word turns yellow, the others fade back strongly |
| `blur-in` | Blur In | clean | Sentence | Poltawski Nowy | blur-in | White serif text, black outline; the active word turns pink; each phrase sharpens in from a blur |
| `with-backdrop` | With Backdrop | boxed | Sentence | Lemon | simple-words-pop | Chunky yellow text, no outline; the active word turns white and pops |
| `soft-landing` | Soft Landing | clean | Sentence | Archivo | slide-in-from-top | White text, no outline; the active word turns cyan; each phrase fades in |
| `baby-steps` | Baby Steps | bold | CAPS | Heebo | hover | White text with a pink outline; the active word turns cyan; a gentle bob |
| `grow` | Grow | bold | CAPS | Kanit | scale-in | White text with a purple outline and shadow; the active word turns pink; each phrase grows in |
| `breathe` | Breathe | fun | CAPS | Lilita One | breathe-scale-wiggle | Rounded white text, black outline, purple shadow; the active word turns green; a slow breathing wiggle |
| `instagram` | Instagram | FrameOS original | CAPS | Arial (fixed) | none | White bold text on a see-through dark box, no word highlight, no motion |
| `none` | No captions | - | - | - | - | No captions at all; the export is the clip as rendered |

Notes:
- Text colour, outline and case are part of each style. There is no colour or case setting - to change them, pick another style.
- Pod P (and, less so, Simple) are already very large. Keep `scale` at 1.2 or below on them.
- The Instagram style's Arial font is built in. Arial is not one of the selectable fonts, so do not send it in `appearance`.

## Suggested uses (guidance, not rules)

| Use case | Try first | Alternatives |
|---|---|---|
| General talking head, safe default | `karaoke` | `mozi`, `simple` |
| High-energy, challenge, gaming, "MrBeast style" | `beasty` | `grow`, `mozi` |
| Podcast, interview, "clean podcast look" | `simple` | `soft-landing`, `youshaei` |
| Calm, professional, LinkedIn | `soft-landing` | `blur-switch`, `deep-diver` |
| Teaching, tips, explainers | `think-media` | `highlighter-box`, `deep-diver` |
| Trendy lifestyle, creator vlog | `popline` | `baby-steps`, `seamless-bounce` |
| Tech, coding, step-by-step | `focus` | `glitch-infinite`, `simple` |
| Comedy, reactions, dramatic beats | `baby-earthquake` | `beasty`, `breathe` |
| Elegant, aesthetic, storytelling | `blur-in` | `blur-switch`, `soft-landing` |
| Readable boxed captions | `instagram` | `deep-diver`, `popline` |
| User adds their own captions elsewhere | `none` | - |

## The 16 fonts (`appearance.font`)

Send the name exactly as written: spelling, capitals and spaces matter. Anything else is rejected with "Unknown caption font".

| Font | Character | Default font of |
|---|---|---|
| Montserrat | Geometric bold sans | Karaoke, Mozi |
| Poppins | Rounded geometric sans | Deep Diver, Glitch Infinite, Seamless Bounce |
| Roboto | Neutral sans | Youshaei, Blur Switch |
| Anton | Tall, condensed, heavy | Highlighter Box |
| Bebas Neue | Tall condensed capitals | Simple |
| Oswald | Condensed sans | Think Media |
| Archivo | Plain grotesque sans | Pod P, Soft Landing |
| Heebo | Plain sans | Baby Steps |
| Kanit | Wide geometric sans | Grow |
| Lilita One | Rounded display | Breathe |
| Spline Sans | Modern sans | Popline |
| Poltawski Nowy | Serif | Blur In |
| Lemon | Chunky rounded display | With Backdrop |
| Luckiest Guy | Comic-book display | Beasty |
| Marcellus | Classical flared serif | Baby Earthquake |
| Roboto Mono | Monospace | Focus |

Mapping words to fonts: serif - Marcellus or Poltawski Nowy; monospace or "code" - Roboto Mono; tall or condensed - Bebas Neue, Anton, Oswald; rounded or friendly - Lilita One, Lemon; cartoon or playful - Luckiest Guy; clean modern sans - Montserrat, Poppins, Roboto, Archivo, Heebo, Spline Sans, Kanit. Custom or uploaded fonts are not available.

## The 17 animations (`appearance.anim`)

Send the id exactly as written (note the mix of hyphens and underscores). `none` turns motion off. Unknown values are rejected with "Unknown caption animation". The style's active-word colour applies whatever the animation.

| Animation id | Kind | What moves |
|---|---|---|
| `pop` | Active word | Jumps to about 118% size and settles back |
| `simple-words-pop` | Active word | A smaller pop, about 110% |
| `scale` | Active word | Grows to about 112% |
| `word-level_karaoke_fill-pop` | Active word | Pops to about 112% and settles back |
| `individual-focus` | Active word + others | Small pop on the active word; the other words fade back strongly |
| `deep-diver` | Other words | The other words are dimmed |
| `blur-switch` | Other words | The other words are blurred and faded |
| `word-level_karaoke_bg-highlight` | Highlight box | A box behind the active word |
| `word-level_simple_bg-highlight` | Highlight box | A box behind the active word (renders the same as the one above) |
| `scale-in` | Phrase entrance | Each phrase grows in from about 60% size |
| `seamless-bounce` | Phrase entrance | Each phrase bounces in: overshoots, then settles |
| `blur-in` | Phrase entrance | Each phrase sharpens in from a blur |
| `slide-in-from-top` | Phrase entrance | Each phrase fades in quickly (there is no actual slide) |
| `baby-earthquake` | Continuous | A small rotating shake |
| `breathe-scale-wiggle` | Continuous | A slow grow-and-tilt, like breathing |
| `glitch-infinite-zoom` | Continuous | A quick pulsing zoom |
| `hover` | Continuous | A gentle vertical bob |
| `none` | - | No motion |

A highlight-box animation on a style that normally has an outline swaps that outline for the box, drawn in the outline's colour.

## Appearance schema

All keys are optional. Send only the keys you want to change from the style's own look.

| Key | Type | Allowed | When absent | Notes |
|---|---|---|---|---|
| `font` | string | One of the 16 fonts | The style's font | Case-sensitive; unknown is rejected |
| `scale` | number | 0.5 to 2.0 | 1.0 | Multiplies the style's text size. Out-of-range values are clamped; rounded to 2 decimals; exactly 1.0 means "no change" and is not saved |
| `yPct` | number | 0.05 to 0.95 | The style's bottom placement | Vertical centre of the caption block as a fraction of frame height from the top (0.5 = middle). Clamped; rounded to 3 decimals |
| `anim` | string | One of the 17 animations, or `none` | The style's animation | Case-sensitive; unknown is rejected |

- The default placement puts the bottom of the caption block about 15% of the frame height above the bottom edge. So a `yPct` above about 0.8 moves captions lower than default, and smaller values move them up.
- Numbers must be JSON numbers. A string such as "1.3" is silently dropped.
- Unknown keys (for example a colour, case or outline) are silently ignored. The `appearance` returned by `set_caption_style` shows what was actually saved - check it.
- Omitting `appearance`, or sending an empty object, clears every saved tweak and returns to the style's own look.
- The saved look applies to the next export and to posting. Each distinct look has its own export file, so the first export after a change renders a new one.

## Turning vague asks into settings

Keep the clip's current style unless the ask is about the style itself. Merge new tweaks into the clip's current `captionAppearance` and send the whole object.

| The user says | Send |
|---|---|
| "Bigger" / "easier to read" | `scale` 1.25 (style unchanged) |
| "Much bigger" / "huge" | `scale` 1.5 (1.2 at most on Pod P or Simple) |
| "Smaller" / "less in-your-face" | `scale` 0.8 |
| "Captions get cut off at the sides" | `scale` 0.8 |
| "Move them up a bit" | `yPct` 0.7 |
| "Put them in the middle" | `yPct` 0.5 |
| "Put them at the top" | `yPct` 0.15 |
| "Lower" / "they cover the face" | `yPct` 0.88 |
| "Less busy" / "calmer" / "stop the bouncing" | `anim` `none`, or switch to `soft-landing` |
| "More energy" / "more pop" | `beasty` or `grow`, or `anim` `pop` on the current style |
| "MrBeast style" | `beasty` with no tweaks |
| "Hormozi-style bold captions" (approximation) | `karaoke` or `mozi` |
| "Clean podcast look" | `simple`, or `soft-landing` for sentence case |
| "Subtle" / "minimal" | `soft-landing` with `scale` 0.9 |
| "Highlight box on the spoken word" | `popline` or `highlighter-box` |
| "One word at a time" | `focus` (still shows up to 3 words, with one emphasised) |
| "Lowercase" / "not all caps" | A Sentence-case style: `soft-landing`, `blur-in`, `deep-diver`, `seamless-bounce` |
| "All caps" | A CAPS style such as `karaoke` or `simple` |
| "Yellow captions" / another colour | No colour setting. Nearest: `with-backdrop` (yellow), `glitch-infinite` (amber), `pod-p` (pink) |
| "Serif" / "typewriter" / "comic" font | `font` Marcellus / Roboto Mono / Luckiest Guy |
| "No animation, same look" | `anim` `none` |
| "Remove the captions" | Style `none` |
| "Back to the original" / "reset" | `karaoke` with no `appearance` |
| "Make it look better" (no direction) | Offer 2-3 options from Suggested uses and let the user pick |

## Example calls

Switch to Beasty with no tweaks (clears any saved tweaks):
`set_caption_style` with `{"clip_id": "<clip id>", "style": "beasty"}`

Keep Karaoke, bigger and higher, Poppins font:
`set_caption_style` with `{"clip_id": "<clip id>", "style": "karaoke", "appearance": {"font": "Poppins", "scale": 1.3, "yPct": 0.7}}`

Re-burn an older burned-in clip in Simple with no motion:
`recaption_clip` with `{"clip_id": "<clip id>", "style": "simple", "appearance": {"anim": "none"}}`
