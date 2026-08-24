---
name: Chap Connect
description: An alumni register for Westlake High School. Deep navy fields, duotone photography, and figures that line up.
colors:
  eanes-navy: "#102047"
  eanes-red: "#A6192E"
  eanes-blue: "#003087"
  eanes-red-deep: "#8d1527"
  eanes-red-light: "#ba4c5c"
  eanes-red-soft: "#c8707d"
  sky-blue: "#00ADEF"
  forest-green: "#097F42"
  bright-gold: "#F0A81E"
  medium-gray: "#A7A9AB"
  field-night: "#16294f"
  cursor-mark: "#ba4c5c"
  paper: "#f7f7f9"
  paper-raised: "#fdfdfd"
  paper-sunken: "#edeef1"
  ink-muted: "#525d79"
  ink-faint: "#606a84"
  hairline: "#dee0e5"
  night: "#0a152e"
  night-surface: "#0e1d40"
  night-ink: "#f5f6f8"
  night-ink-muted: "#b7bcc8"
  night-ink-faint: "#9ba1b2"
  on-navy: "#f5f6f8"
  on-navy-muted: "#A7A9AB"
  signal-good: "#08773e"
  signal-warn: "#845c11"
  signal-bad: "#A6192E"
  signal-info: "#003087"
typography:
  display:
  fontFamily: "Gotham, Montserrat, Arial, Helvetica, sans-serif"
  fontSize: "4.25rem"
  fontWeight: 600
  lineHeight: 0.94
  letterSpacing: "-0.035em"
  title:
  fontFamily: "Gotham, Montserrat, Arial, Helvetica, sans-serif"
  fontSize: "2.5rem"
  fontWeight: 600
  lineHeight: 1.04
  letterSpacing: "-0.028em"
  headline:
  fontFamily: "Gotham, Montserrat, Arial, Helvetica, sans-serif"
  fontSize: "1.5rem"
  fontWeight: 600
  lineHeight: 1.2
  letterSpacing: "-0.02em"
  body:
  fontFamily: "Gotham, Montserrat, Arial, Helvetica, sans-serif"
  fontSize: "1rem"
  fontWeight: 400
  lineHeight: 1.6
  letterSpacing: "normal"
  label:
  fontFamily: "Gotham, Montserrat, Arial, Helvetica, sans-serif"
  fontSize: "0.875rem"
  fontWeight: 500
  lineHeight: 1.4
  letterSpacing: "normal"
  micro:
  fontFamily: "Gotham, Montserrat, Arial, Helvetica, sans-serif"
  fontSize: "0.75rem"
  fontWeight: 500
  lineHeight: 1.35
  letterSpacing: "normal"
  figure:
  fontFamily: "Gotham, Montserrat, Arial, Helvetica, sans-serif"
  fontSize: "1.25rem"
  fontWeight: 500
  lineHeight: 1.2
  fontFeature: "tabular-nums"
rounded:
  slight: "6px"
  panel: "10px"
  full: "999px"
  legacy: "0.375rem"
spacing:
  hair: "2px"
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "56px"
  field: "64px"
components:
  button-primary:
  backgroundColor: "{colors.eanes-red}"
  textColor: "#ffffff"
  typography: "{typography.label}"
  rounded: "{rounded.slight}"
  padding: "14px 28px"
  button-primary-hover:
  backgroundColor: "{colors.eanes-red-deep}"
  textColor: "#ffffff"
  button-secondary:
  backgroundColor: "#ffffff"
  textColor: "{colors.eanes-navy}"
  typography: "{typography.label}"
  rounded: "{rounded.slight}"
  padding: "14px 16px"
  link-inline:
  textColor: "{colors.eanes-red}"
  typography: "{typography.label}"
  padding: "0 0 2px 0"
  input-underline:
  backgroundColor: "transparent"
  textColor: "{colors.eanes-navy}"
  typography: "{typography.body}"
  rounded: "{rounded.slight}"
  padding: "10px 0"
  card-register:
  backgroundColor: "#ffffff"
  textColor: "{colors.eanes-navy}"
  rounded: "{rounded.slight}"
  padding: "24px"
  navy-field:
  backgroundColor: "{colors.eanes-navy}"
  textColor: "{colors.on-navy}"
  rounded: "{rounded.slight}"
  padding: "56px 32px"
  chip-heritage:
  textColor: "{colors.eanes-blue}"
  typography: "{typography.label}"
  rounded: "{rounded.slight}"
  padding: "0px"
---

# Design System: Chap Connect

## Overview

**Creative North Star: "The Alumni Register"**

Chap Connect imitates a bound institutional register - the kind of ledger a school keeps of the people who passed through it. Navy fields open a page the way a cover opens a book. Hairline rules separate entries. Graduation years are set in brass with figures that line up in a column. The design's job is to make a record of people feel *kept properly*, not to make a database feel fun.

The system is flat and precise by construction, but it is not austere. A small, closed vocabulary of ornamental marks carries the brand: a red rule that draws itself beneath a masthead, brass figures indexing a class year, a doubled rule opening a list. Ornament here is always load-bearing - it marks a peak, an index, or a boundary. Decoration that encodes nothing is not part of the language.

Density is generous at the peaks and tight in the entries. Every screen has exactly one loud thing: either a navy field or a red action, never both competing. The visual world was arrived at by removing an accumulated layer of generated-looking effects - animated gradients, glow, float, emoji standing in for icons, drop shadows, uppercase micro-labels. Those are not stylistic preferences to revisit; they are the confirmed anti-reference.

**Key Characteristics:**
- Flat by construction - no shadows anywhere, depth from rules and tonal surface steps
- Navy owns whole regions; red appears once per view
- A 3px radius - present but only just; larger steps are a defect
- Display type at real size (up to 4.25rem) carries emphasis, never font weight
- Tabular figures wherever numbers are compared
- A closed set of four ornamental marks, each carrying meaning
- Contrast verified by computation, never by eye

## Schemes

The system ships two complete schemes. They are not a light/dark pair; that axis is separate and both schemes have a light and a dark form, so four combinations resolve.

**Chaparral** is the default, and it is the Eanes ISD brand identity applied literally. The official logo palette, unaltered, with Gotham as the district specifies. Eanes Navy is the ink and the field, Eanes Red owns primary action, Eanes Blue is the index hue. It is the district's own voice, not an interpretation of it.

**Ivy** is the second register, reached through the scheme toggle. Newsreader and Inter on a warm Cream ground, with Ink Navy, Westlake Red and Oxblood doing nearly all the work. Its point is not a hue rotation. It is a different distribution of the same family:

- **Navy owns primary action, red and oxblood own emphasis.** Chaparral gives action to red, so if Ivy did the same the two schemes would be one scheme in two typefaces. Keeping action blue is what makes the pair distinct while both stay Eanes.
- **Oxblood holds `--heritage`.** That single role carries class years, heritage marks and quoted edges, so it is the largest lever on how much red the scheme shows. Gold held it in the first draft, which is exactly why red was nearly absent.
- **The warmth is in the paper only.** Cream is the ground, Card the raised surface, Parchment the recessed one. Everything printed on that paper is navy or red.
- **Ink and hairlines are navy, not brown.** This is where most of the scheme's blue comes from. Body ink is Ink Navy itself and secondary tones are that navy held at real chroma; the hairline is a blue tint at 1.32:1 on Cream, matching the weight of the warm line it replaced so structure gained hue without gaining weight. Ink and rules cover far more surface than any accent, so this moves the whole feel more than adding another red element would.

  A caution: reaching these by mixing navy toward Cream does not work. Cream is warm enough to cancel the chroma, and the result lands on gray. The navy-family neutrals are chosen at chroma, not interpolated.
- **Gold survives in two places only:** the warning signal, where amber is the convention and a semantic role is not decoration, and the last and rarest chart series. Both use the text-safe gold: on Cream the fill gold reaches only 2.92:1, so it cannot carry either role. Gold is not an ornamental device here.
- **The duotone is two school inks.** The photographic band ranges Ink Navy at the top down to Oxblood at the bottom.
- **At night the scheme stays blue.** Grounds are the navy carried down to near-black rather than a warm black, and action is a lifted Bright Navy.
- **Emphasis is italic serif, not bold.** Newsreader at 700 turns muddy at display size.

### Derived values

Red cannot appear on the navy field or the night ground at full strength: it reaches 2.17:1 and 2.55:1 there. So the scheme carries four lightenings, each the least lift that clears its target, and each a lightening of a given colour rather than a new hue. They are named `red-lift`, `red-on-navy`, `ox-lift` and `navy-lift`.

**The Two-Constraint Fill Rule.** A filled control must clear 3:1 against the page or it has no shape, and its label must clear 4.5:1 against the fill. Those pull in opposite directions, and on a dark ground the window between them can be only a few steps wide. In dark Ivy, using Cream as the label leaves exactly one usable fill; using Card widens it to four, which is the only reason a hover state fits at all. Check both constraints together, never one at a time.

### Implementation

Scheme is an `.ivy` class on `<html>`, independent of `.dark`, applied pre-paint from `cc_scheme`. It remaps semantic roles and the two font tokens only. No component knows either scheme exists, which is the whole return on the role indirection: the second scheme cost a block of variables, not a redesign.

The exceptions are deliberate and scoped to `.ivy`: the type register, the photographic treatment, and table ruling. These are changes a role remap cannot express.

**The Backdrop Hue Rule.** A `mix-blend-mode: luminosity` image takes hue from the backdrop and discards its own. Warming such a photograph with a `sepia()` filter does nothing at all. To retone a duotone, retone the ground beneath it.

## Colors

The official Eanes ISD logo palette, used as given rather than reinterpreted. Every value carries its Pantone lineage, so anything produced here matches print. Identity belongs to the three Eanes-named colours; the campus colours support them.

### Primary
- **Eanes Navy** (`{colors.eanes-navy}`, PMS 2766 C): The dominant colour and the system's signature. Owns entire regions, never small tinted accents, and it is also the body ink in light mode, so text and field are the same pigment at different scales.
- **Eanes Navy Lifted** (`{colors.field-night}`): The navy field in dark mode. Eanes Navy against the night ground is 1.14:1, so a field painted in it disappears into the page. The dark field must sit *above* its canvas, not below it.

### Secondary
- **Eanes Red** (`{colors.eanes-red}`, PMS 187 C): Action only. The submit button, the copy button, an inline link. Never a background for content, never a decorative tile.
- **Eanes Red Deep** (`{colors.eanes-red-deep}`): The action hover.
- **Eanes Red Light** (`{colors.eanes-red-light}`): Red lifted for use *on* the navy field, where full-strength Eanes Red reaches only 2.17:1. Also the pointer mark, being the one red that clears 3:1 on both the page and the field.
- **Eanes Red Soft** (`{colors.eanes-red-soft}`): Red in dark mode. Red Light manages 2.92:1 on the lifted dark field, which is why a second step exists.

### Tertiary
- **Eanes Blue** (`{colors.eanes-blue}`, PMS 287 C): The index hue. Class years, heritage markers, and the quoted-content edge. Deliberately rare.
- **Sky Blue** (`{colors.sky-blue}`, PMS 306 C): The one colour that is better on navy than on paper: 6.23:1 against the field, 2.47:1 against the page. It carries blue wherever Eanes Blue cannot go, which is every dark surface, since Eanes Blue reaches only 1.68:1 there.

### Support and semantic
- **Forest Green** (`{colors.forest-green}`, PMS 348 C) and **Bright Gold** (`{colors.bright-gold}`, PMS 7409 C): campus colours, used for semantic signals and chart categories. Both are darkened for text use (`{colors.signal-good}`, `{colors.signal-warn}`).
- **Medium Gray** (`{colors.medium-gray}`, Cool Gray 6 C): secondary text on the navy field at 6.75:1. Never body text on paper, where it is 2.28:1.

### Neutral
- **Paper** (`{colors.paper}`) / **Paper Raised** (`{colors.paper-raised}`) / **Paper Sunken** (`{colors.paper-sunken}`): the light grounds, all Eanes Navy carried toward white, so every gray in the product is the brand navy at low chroma rather than a borrowed ramp.
- **Hairline** (`{colors.hairline}`): the default rule. Structure comes from this colour more than from any other.
- **Ink Muted** (`{colors.ink-muted}`) / **Ink Faint** (`{colors.ink-faint}`): secondary and tertiary text, both in the navy family.
- **Night / Night Surface** (`{colors.night}`, `{colors.night-surface}`): dark-mode grounds, the navy carried toward black rather than inverted.
- **On Navy / On Navy Muted** (`{colors.on-navy}`, `{colors.on-navy-muted}`): text on the field.

### Named Rules

**The One Red Rule.** Exactly one red element per view, and it is always the primary action. If a screen has two reds, one of them is decoration and must be removed.

**The No Gray On Color Rule.** Secondary text on a navy field is Medium Gray from the palette, or a navy-derived tone. Never a warm or neutral gray from outside the family.

**The Computed Contrast Rule.** No colour pair ships without a computed WCAG ratio. Body text clears 4.5:1 and controls, marks and chart series clear 3:1 on *every* surface they can land on, in both themes and both schemes. Eyeballing a ratio is not verification.

**The Brand Colour Is Not Always Usable Rule.** Three official colours fail as body text on paper: Bright Gold at 1.97:1, Sky Blue at 2.47:1, Medium Gray at 2.28:1. Eanes Red fails on the navy field at 2.17:1 and in dark at 2.66:1; Eanes Blue fails in dark at 1.68:1. A brand palette specifies ink for print, not contrast for screens. Honour the colour by deriving the least lift that clears the threshold, never by using it where it cannot be read.

## Typography

The district specifies the **Gotham** family for written communication, so the interface is one geometric sans carrying both display and body: hierarchy comes from size and weight, not from a second face.

Gotham is a commercial Typography.com licence and cannot be served from this repository. The stack asks for it first, so dropping in a licensed webfont takes over with no other change, then **Montserrat** as the closest free geometric sans, then **Arial**, which the district's own guide names as the sanctioned substitute.

**Sanchez** is the slab in the Eanes logo and is available, so the wordmark is set in it through a `.wordmark` class. It ships in exactly **one weight (400)**, which is why it is confined to the wordmark: setting headings in it would turn every `font-semibold` heading into a browser-synthesised fake bold, and a faked slab is unmistakable.

Body copy is `{typography.body}`; small caps and eyebrows are `{typography.label}`.

**The Single Weight Rule.** Before setting a face, check which weights it actually ships. A Google Fonts request for `wght@400;700` on a single-weight family returns HTTP 200 and silently serves only 400, so the request succeeding proves nothing.

## Layout

A centered measure with full-bleed peaks. Content sits in a `max-w-5xl` container with responsive gutters (16px / 24px / 32px); mastheads escape it with matching negative margins so a navy field spans the container edge-to-edge while its text stays on the measure.

Spacing follows a 4-unit base with deliberate contrast rather than one repeated value: 6px inside a label→value pair, 24-32px between entries, 56-64px between sections. Tight groups and generous separation are what make grouping legible without containers.

The sign-in surface is a two-column split (`1.15fr / 1fr` at `lg`, `1.25fr / 1fr` at `xl`) that stacks below `lg` with the navy field first - DOM order matches visual order at every width, so keyboard and assistive traversal agree with reading order. Lists are three-column definition lists (`15rem / 1fr / auto`) above `sm` and stack below it.

### Named Rules

**The Proximity Before Container Rule.** Group by space first. A container is only justified when proximity alone cannot express the grouping - which, in a register, is rare.

**The Full-Bleed Peak Rule.** A navy field bleeds to the container edge via negative margins that exactly cancel the parent's padding. Its inner text stays on the measure. Mismatched values produce horizontal overflow, so the two must be edited together.

## Elevation & Depth

**Photography and field depth.** Two materials were added after the first pass, on the strength of a direct brief ("less bland, less sharp"): a **single-hue vignette** on the navy field (one hue at two depths, never a multi-hue gradient), and **duotone photography** in defined bands. Photography is pushed to greyscale and composited into the navy hue so a photo reads as art direction rather than dropped-in stock. Type never overlaps a photo: bands are separate from text blocks, so contrast stays deterministic rather than depending on what the image happens to contain.

**This system has no shadows.** Not softened ones, not colored ones, not a single ambient one. `box-shadow` is `none` throughout, and the legacy `.brutal-shadow` / `.brutal-shadow-sm` classes are deliberately no-ops kept only so unmigrated markup doesn't break.

Depth is conveyed two ways. **Rules** carry structure: a 1px hairline separates peers, a 2px rule opens a list or marks a boundary. **Tonal steps** carry layering: `paper` (canvas) → `#ffffff` (surface) → `paper-sunken` (recessed), with the dark theme composing its own three steps rather than inverting them. Overlap is the third, rarest tool - the match cards are pulled up 32px to cross the navy field's lower edge, which reads as depth without any blur.

### Named Rules

**The Photo Band Rule.** Photography lives in its own band, welded to the field above it by a top fade. Text never sits on top of a photo. A scrim-plus-alpha stack that makes contrast depend on image content is not acceptable; a separate band is.

**The No Shadow Rule.** There is no shadow token because there is no shadow. A request for "more depth" is answered with a rule, a tonal step, or overlap - never by reintroducing `box-shadow`.

## Shapes

**Near-square is the form language.** Corners carry a 3px radius - present, but only just. Buttons, cards, fields, and chips all use it. The value is deliberately small: enough that controls read as touchable, not enough to soften the ruled, tabular feel of the register. Full-bleed navy fields stay hard-cornered, because a radius on an edge-to-edge bleed reads as a mistake.

Borders do the work corners used to. A 1px hairline is the default; 2px marks something structural (a list's top rule, a brass quote edge, the drawn accent). Inputs are underlines rather than boxes: a single bottom rule that shifts to Eanes Red on focus. Avatars are the one intentional circle, because a face is not an entry.

The `legacy: 0.375rem` token records the radius the app used before this system. It is a record of drift, not an option.

### Named Rules

**The Two-Step Radius Rule.** Controls (buttons, inputs, chips) get `rounded-slight` (6px); cards, panels, and tiles get `.panel` (10px), so a card never reads as a button. Nothing gets a third value. Earlier passes used 3px for both and read as sharp.

**The Slight Radius Rule (superseded).** Surfaces and controls got `rounded-slight` (3px) - never a larger step. `rounded-md` and above are a defect. Controls (`button`, `input`, `select`, `textarea`) receive it from a base rule and need no class. Two exceptions: `rounded-full` on an avatar or loading spinner (four uses in the codebase), and full-bleed navy fields, which stay at 0.

## Components

Precise foundation, with a closed ornamental vocabulary carrying the brand. Components should feel like well-set entries in a register - exact, but not bare.

### The Ornamental Register (signature)

Four sanctioned marks. Ornament may only come from this list, and each instance must encode something:

1. **The Drawn Eanes Rule** - a 2px × 6-8rem red bar beneath a masthead that animates its own width once (`.rule-draw`, `scaleX` 0→1, 600ms, exponential ease-out). Marks a page's peak. **One per page.** On navy it must use Eanes Red Light.
2. **The Brass Class-Year Marker** - a graduation year in brass with tabular figures, labelled "Class of". The register's index.
3. **The Double Top Rule** - a 2px rule opening a list, with 1px hairlines between entries. The printed-table convention; gives a list authority without cards.
4. **The Brass Border-Left Marker** - a 2px brass left edge on quoted or elevated content (an AI match rationale, a signed-in state block). Ornament that encodes "this came from elsewhere".

**On the marker and the `side-tab` detector rule.** A 2px coloured left border is normally an anti-pattern, and the mechanical detector flags it as `side-tab`. This mark is a deliberate, confirmed exception, and it is scoped tightly: **quoted or borrowed content only.** It is *not* licensed for callouts, alerts, status cards, or list-item selection - those use a full hairline and let the semantic text role carry the meaning. Expect two standing `side-tab` findings ([WelcomeScreen.jsx](src/components/WelcomeScreen.jsx), [OutreachMessage.jsx](src/components/OutreachMessage.jsx)) plus the brass quote edges in the match views; do not "fix" them. A `side-tab` finding anywhere else is a real defect.

### Buttons
- **Shape:** Hard corners (0px). Full-width in forms, inline with 28px horizontal padding elsewhere.
- **Primary:** Eanes Red ground, white text, Label type, 14px/28px padding. One per view.
- **Hover / Focus:** Background shifts to Eanes Red Deep on hover (colour only - no lift, no scale, no shadow). Focus is the global 2px Eanes Red outline at 2px offset.
- **Secondary:** White surface, navy text, 1px `rule-strong` border that darkens to full ink on hover.
- **Tertiary:** A text link with a transparent bottom border that fills in on hover. Preferred over a third button whenever the action is not primary.

### Cards / Containers
- **Corner Style:** 0px.
- **Background:** `#ffffff` surface on `paper` canvas; `night-surface` on `night`.
- **Shadow Strategy:** None - see Elevation & Depth.
- **Border:** 1px hairline on all sides; internal sections divided by hairlines rather than nested containers.
- **Internal Padding:** 24px, with header/body/footer regions separated by full-bleed hairlines.

### Inputs / Fields
- **Style:** Underline only - transparent background, 1px bottom hairline, 0px radius, 10px vertical padding, Body type at 1.125rem.
- **Focus:** The bottom rule shifts to Eanes Red; no ring, no glow, no background change. The caret is Eanes Red globally.
- **Labels:** Label type in `ink-muted`, sentence case, 4px above the field. Always a real `<label>` with `htmlFor`.
- **Numeric fields:** carry `.tabular`.

### Lists / Registers
- **Structure:** A `<dl>` with a 2px `rule-strong` top rule and 1px hairlines between entries. Three columns (`15rem / 1fr / auto`) above `sm`, stacked below.
- **Entry:** Headline term, Body description capped at `max-w-prose`, right-aligned action link.
- **Never** convert a register into a grid of equal cards.

### Pointer bubble

- A translucent ring with a darker rim trails the pointer; an opaque dot sits on the exact position. Colour is `{colors.cursor-mark}`, a mid-tone blue picked so one value clears 3:1 on both the paper ground and a navy field, since the cursor crosses both.
- Driven entirely by motion values, never React state. A `useState`-per-frame follower re-renders the tree on every mouse move and collapses on mid-range hardware.
- Disables itself on coarse pointers, under `prefers-reduced-motion`, and under `forced-colors`, where the operating system owns cursor rendering. `pointer-events: none` throughout, so it can never intercept a click.
- **This is a deliberate exception to a normal prohibition.** Custom cursors override the OS cursor-size and high-contrast settings that low-vision users rely on. It ships because it was explicitly requested; removing it is deleting one line in [App.jsx](src/App.jsx).

### Tabs

- The active indicator reads as a **folder tab**: a wide shallow dome across the top, near-square corners along the bottom (`38px 38px 6px 6px / 26px 26px 6px 6px`), sitting on the strip's baseline and **overhanging its top border by 8px**. The overhang is what makes the current section legible at a glance, so the pill's negative top offset must always exceed the strip's top padding; keeping it inside reads as a plain highlight.
- Position between tabs is owned by framer-motion `layoutId`, so the library measures it. The hand-rolled alternative (measure on click plus a resize listener) drifts whenever layout changes for any reason other than a click.
- **Magnetic response** lives on a nested element, never the same one that carries `layoutId`, because layout animation and transforms on one element conflict. It leans up to 7px toward the cursor, lifts 2px, and swells to 1.035 on hover. Pointer position is held in motion values, never React state: a `useState`-per-move version re-renders the tree on every mouse movement. Only `transform` is animated. Under `prefers-reduced-motion` the magnetics drop out entirely and the pill simply moves.
- Active tab carries a brass icon on navy (`text-heritage-on-navy`) and an `on-navy` label; inactive tabs sit in `ink-faint` / `ink-muted`.
- `role="tablist"` with arrow, Home, and End keys; only the active tab is in the tab order.

### Magnetic controls

- Primary actions lean toward the cursor, tilt a fraction in the direction of travel, and swell to 1.02 on hover. The character comes from **three tiny transforms layered together**, not one large one: individually none is noticeable, together the control feels attentive. Default lean is 5px; wide full-width controls use 4.
- Applied to primary actions only (`Continue`, `Continue with Google`, `View Directory`, `Find my match`, `Copy message body`). Magnetics on small icon buttons is noise, not character.
- Implemented by [Magnetic.jsx](src/components/ui/Magnetic.jsx), polymorphic via `as="button" | "a"`, forwarding all props so `type="submit"` and `disabled` behave normally.
- Pointer offset lives in motion values; the component contains **no `useState`**, so moving across a control costs zero re-renders. Only `transform` is animated. Under `prefers-reduced-motion` the `style` prop is dropped entirely and it renders as a plain element.

### Charts (CRM)
- **Series colors:** a six-step categorical scale exposed as `--series-1` … `--series-6` and consumed via `var(--series-N)`. It alternates the blue and red families *and* steps lightness, so adjacent series stay distinguishable.
- **Theme-aware by necessity:** a single fixed ramp cannot clear 3:1 on both canvases - the darkest navy is 1.14:1 on the dark ground and the lightest brass is 2.33:1 on the light one. The scale is therefore redefined in the `.dark` block, not reused.
- **Red is a data category here, not an action.** The CRM is the one analytical surface in the app, and its register is blue-and-red rather than the brass used for heritage marks elsewhere. Brass is deliberately absent from data viz.
- Every series carries a text label in the legend, so color is never the only code.

### Navigation
Currently unmigrated (see Do's and Don'ts). The target treatment is a hairline-bottom tab strip with the active tab marked by a 2px Eanes Red bottom rule and full-ink label, inactive tabs in `ink-faint` - no filled pills, no rounded tabs.

## Do's and Don'ts

- **Do** compose a scheme's dark form rather than deriving it. Ivy's action color changes from navy to gold at night because navy cannot survive a warm-black ground.
- **Do** keep a fill color and its text-safe darkening as separate tokens whenever the fill fails 4.5:1. One token for both guarantees an illegible label.
- **Don't** add a scheme by editing components. If a new scheme needs a component changed, the missing piece is a semantic role.

### Do:
- **Do** reference semantic roles (`text-ink`, `bg-canvas`, `bg-action`, `border-rule`, `text-on-navy`) in components. Primitives (`navy-900`, `eanes-500`) belong in `src/index.css` only, so a theme change remaps roles without editing a component.
- **Do** give every page exactly one peak - a navy field or a display heading, not both.
- **Do** compute contrast before shipping a color. Every pair clears AA on every surface it can land on, in both themes.
- **Do** use Eanes Red Light for red marks on navy; full-strength Eanes Red fails there (2.83:1).
- **Do** use `text-heritage-on-navy` for brass on a navy field in *either* theme. The light-theme brass is only 3.16:1 on navy; the light variant reaches 7.04:1.
- **Do** reach for a rule, a tonal step, or overlap when something needs depth.
- **Do** apply `.tabular` to any figure a reader will compare.
- **Do** reserve magnetic response for primary actions. Applying it to every button flattens the hierarchy it is meant to express.
- **Do** keep brass out of the CRM *and off the sign-in surface*. Brass marks class years and quoted content inside the product only. Heritage brass marks class years and quoted content; the CRM's analytical charts use the blue/red series.
- **Do** keep ornament to the four sanctioned marks, and make each instance carry meaning.
- **Do** compose the dark theme by redefining semantic roles in the `.dark` block.

### Don't:
- **Don't** reintroduce any AI-slop tell: animated or text gradients, glow, float, `box-shadow`, emoji-as-icon, `uppercase` micro-labels, `font-bold`/`font-black`, spring pop-ins, `whileHover` scale, hover-lift cards, or an eyebrow label above a heading. This is the confirmed anti-reference, not a preference.
- **Don't** build toward the generic SaaS dashboard: purple/indigo gradients, pill buttons, stat-tile hero rows, sparkline decoration, or a grid of three equal icon+heading+text cards as page structure.
- **Don't** use `rounded-*` in new code. Square corners are the form language.
- **Don't** exceed weight 600, or use color as the only carrier of information.
- **Don't** put gray text on a colored ground - derive it from the ground's hue.
- **Don't** treat `.brutal-shadow` as live styling. It is an intentional no-op retained for unmigrated markup; remove it when you touch a file rather than restoring its effect.
- **Don't** add a second brass element to a view, or a second red one.

### Known drift

The token migration is complete: every screen consumes semantic roles, and a repo-wide grep for legacy `slate-*` / `blue-*` / `green-*` / `amber-*` utility classes returns zero hits.

| File | Status |
|---|---|
| `src/App.css` | Dead Vite scaffold - not imported; safe to delete |
| `src/components/ui/ScrollMorphHero.jsx` | Intentionally exempt - a deliberate scroll-morph effect, and the one remaining detector finding |
