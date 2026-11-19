---
name: "billcheck"
description: "The implemented visual system for the local invoice checker."
colors:
  ground: "#f5f7f5"
  surface: "#fff"
  ink: "#26352e"
  muted: "#5d6c63"
  line: "#d8e0da"
  green: "#275c42"
  green-hover: "#1c4832"
  green-tint: "#e8f1eb"
  error: "#9e3b2d"
  error-tint: "#faede9"
  warning: "#805b17"
  warning-tint: "#f8f0dd"
  focus: "#356eaf"
  disabled-ink: "#68766e"
  disabled-ground: "#edf0ed"
  input-border: "#86988d"
  secondary-border: "#9cafa2"
typography:
  display:
    fontFamily: "Lato, sans-serif"
    fontSize: "clamp(28px, 3vw, 36px)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Lato, sans-serif"
    fontSize: "25px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Lato, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.5
  body:
    fontFamily: "Lato, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  detail:
    fontFamily: "Lato, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Lato, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  metadata:
    fontFamily: "Lato, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  value:
    fontFamily: "ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  badge: "4px"
  input: "5px"
  button: "6px"
  drop-zone: "8px"
  report: "10px"
  status: "50%"
spacing:
  small-gap: "8px"
  control-gap: "10px"
  inline-gap: "12px"
  mobile-inset: "20px"
  section-gap: "24px"
  report-inset: "28px"
  workspace-gap: "36px"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.surface}"
    rounded: "{rounded.button}"
    padding: "10px 22px"
  button-primary-hover:
    backgroundColor: "{colors.green-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "9px 16px"
  button-text:
    textColor: "{colors.green}"
    rounded: "{rounded.button}"
    padding: "10px 7px"
  button-disabled:
    backgroundColor: "{colors.disabled-ground}"
    textColor: "{colors.disabled-ink}"
  amount-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.input}"
    padding: "10px 12px"
    width: "100%"
  filter:
    textColor: "{colors.muted}"
    rounded: "{rounded.button}"
    padding: "9px 10px"
  filter-selected:
    backgroundColor: "{colors.green-tint}"
    textColor: "{colors.green}"
  severity-error:
    backgroundColor: "{colors.error-tint}"
    textColor: "{colors.error}"
    rounded: "{rounded.badge}"
    padding: "3px 7px"
  severity-warning:
    backgroundColor: "{colors.warning-tint}"
    textColor: "{colors.warning}"
    rounded: "{rounded.badge}"
    padding: "3px 7px"
  review-sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.report}"
  finding-summary:
    textColor: "{colors.ink}"
    padding: "20px 46px 20px 28px"
  pagination-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "7px 12px"
---

# Design System: billcheck

## Overview

**Creative North Star: "Working Review Sheet"**

This system uses a pale mineral ground, white work surfaces, evergreen actions, and graphite text. It gives invoice findings a restrained, readable hierarchy.

These are implementation choices for the local preview, not confirmed user brand preferences. The working name is billcheck. Final branding remains undecided.

Checked now on 2026-11-01 against the stylesheet, markup, interaction code, and refreshed review captures. The implementation is the source for every recorded token.

**Key Characteristics:**

- One self-hosted sans-serif family for headings, controls, and prose.
- Flat surfaces with fine rules and restrained corner rounding.
- Issue severity appears through words, icons, and color.
- Native disclosures expose detail within a stable reading order.

## Colors

The palette uses quiet green neutrals with separate error, warning, and focus colors. The frontmatter records their exact values.

### Primary

- **Evergreen**, `green`, identifies primary actions, links, and passing results.
- **Deep evergreen**, `green-hover`, darkens interactive text and filled actions on hover.
- **Evergreen tint**, `green-tint`, supports selected filters, passing icons, and hover feedback.

### Neutral

- **Mineral white**, `ground`, fills the page.
- **White**, `surface`, fills the review sheet, picker, and editable field.
- **Graphite**, `ink`, carries headings and primary prose.
- **Muted green gray**, `muted`, carries supporting text.
- **Pale rule**, `line`, separates findings and structural regions.
- **Disabled ink and ground** distinguish unavailable buttons.
- **Input and secondary borders** distinguish editable fields and outlined actions.

### State colors

Error red and its tint mark errors. Ochre and its tint mark warnings. Focus blue identifies keyboard position.

**The State Meaning Rule.** Green identifies actions and passing results. Red identifies errors. Ochre identifies warnings. Visible words preserve these meanings without color.

## Typography

**Display Font:** Lato, with a sans-serif fallback.

**Body Font:** Lato, with a sans-serif fallback.

**Value Font:** The platform monospace stack records reported values. Code elements use the browser's monospace face for field names and diagnostic codes.

The interface self-hosts regular and bold Lato files. The accompanying `web/assets/OFL.txt` records the SIL Open Font License, version 1.1.

### Hierarchy

| Role | Use |
| --- | --- |
| Display | The page title uses a responsive size and tight tracking. |
| Headline | Result, empty, and pending headings establish the main state. |
| Title | Finding names and correction subheadings use bold text. |
| Body | Base text and full-size controls share the root type size. |
| Detail | Explanations use a relaxed line height and a maximum measure of 68ch. |
| Label | Supporting controls and counts use a smaller scale. |
| Metadata | File size, locations, and pagination labels remain secondary. |
| Value | Reported values use monospace and tabular numerals. |

Result headings reduce to 23px at the narrow-desktop breakpoint and 22px on mobile. Empty and pending headings retain their 25px size.

Reference text currently uses 11px, with diagnostic codes at 10px. These local metadata sizes do not define the body-copy baseline.

**The One Text Voice Rule.** Lato carries headings, prose, and controls. Monospace identifies field names, diagnostic codes, and reported values.

## Layout

The current surface has a centered container with a maximum width of 1248px. Desktop side padding is 36px.

The desktop workspace pairs a 310px input column with a flexible report. Its gap is 36px, and both columns align at the top.

The direction brief described a 340px input column. This document records the implemented 310px value without changing that brief.

At widths of 1000px or less, the input column becomes 270px. The gap becomes 24px, and page padding becomes 28px.

At widths of 740px or less, the workspace becomes one column. Page padding becomes 20px, and the workspace gap becomes 28px.

The desktop masthead is 88px high. The mobile masthead is 72px high. The mobile picker hides its decorative file icon.

Finding summaries retain compact metadata. Expanded explanations use additional inset on desktop and full available width on mobile.

Toolbars and value pairs wrap when space narrows. Long file names, field identifiers, and reported values can wrap anywhere.

These measurements describe the current checker surface. They do not require every future screen to repeat its two-column composition.

## Elevation & Depth

The page uses flat tonal layers. A white review sheet and fine rules separate the work area from the mineral ground.

**The Flat Surface Rule.** Fine borders and changes in surface tone separate content. The current interface uses no shadows.

Keyboard focus uses a 3px blue outline with a 4px offset. Finding summaries place the outline 4px inside their boundary.

Selection colors, an evergreen text caret, and a green-gray scrollbar extend the palette to browser controls.

## Shapes

Small badges, inputs, buttons, the picker, and the review sheet use distinct corner radii from the frontmatter.

Circular status holders measure 44px across. Authored SVG icons use rounded stroke caps and joins. The common icon size is 20px.

The picker uses a dashed border. The review sheet and finding separators use solid hairlines. Native disclosures provide the expandable structure.

No raster assets ship in this interface. The logo and interface symbols use SVG.

## Components

### Buttons

Primary actions use evergreen fills and white text. Secondary actions use white fills and visible borders. Text actions use evergreen text.

Buttons share a minimum height of 44px and bold labels. Hover changes use 150ms ease-out transitions.

Disabled buttons use muted colors and the default cursor. Visible keyboard focus uses the shared outline.

### File picker

The picker combines a native file input, a visible button, and a drop target. Drag feedback adds a green tint and outline.

The selected file appears beneath the picker with its size. Synthetic examples carry an explicit label. Clear returns focus to file selection.

### Amount input

The tolerance input uses a white fill, a restrained border, and an evergreen caret. Its label and help text remain visible.

Invalid input receives an error border and nearby explanatory text. Validation opens the settings disclosure and focuses the field.

Editing tolerance invalidates the displayed report. The user explicitly checks again before receiving updated findings.

### Review sheet

A bordered white container holds the empty, pending, and result states. The empty state offers two synthetic examples.

Pending work shows a spinner and recovery guidance. The spinner rotates once per second while work runs.

Reduced-motion preferences disable animations and transitions. The current interface adds no entrance choreography.

Completed results focus the result summary. On mobile, that focus brings the summary into view.

### Filters and severity labels

Findings filters use pressed-state buttons. The selected filter has a green tint, and each filter includes its count.

Severity labels pair written Error or Warning text with the corresponding state colors. Status summaries also use distinct SVG symbols.

### Findings

Each finding uses a native disclosure. Its summary combines severity, the problem name, and location.

Expanded content contains the field, explanation, correction, reported values, and source reference when available.

A chevron changes direction with the disclosure state. Hover adds a slight surface tint. Keyboard focus remains visible inside the summary.

### Pagination and export

The report displays at most 50 findings per page. Previous and Next focus the first finding after the replacement page arrives.

Filtering retains focus on the selected filter. A live announcement gives the displayed range or the empty-filter result.

Report export saves the complete JSON report. Its button disables while the worker prepares the download.

### Coverage disclosure

The coverage disclosure keeps implemented checks and remaining limits near the report. Passing copy explicitly limits the meaning of a clean result.

## Do's and Don'ts

### Do:

- Do retain visible keyboard focus and the existing minimum control height.
- Do pair severity color with a written label and a distinct status icon.
- Do keep correction prose readable while long file names and reported values wrap.
- Do preserve self-hosted fonts and the reduced-motion override.
- Do keep synthetic examples labeled and passing results qualified.

### Don't:

- Don't imply that a passing check guarantees portal acceptance.
- Don't replace native disclosure or button semantics with decorative containers.
- Don't apply the small reference-code size to general body copy.
- Don't turn this preview's implementation choices into claims about the user's brand preferences.
