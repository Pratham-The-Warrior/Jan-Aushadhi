# Design System Specification: Clinical Prestige

This document defines the visual language and structural logic for the design system. Moving away from the approachable "app-like" aesthetics of the past, this system adopts a **"Clinical Prestige"** North Star. It balances the cold precision of high-end medical technology with the sophisticated warmth of premium editorial design. 

By leveraging intentional asymmetry, tonal layering, and an authoritative typographic hierarchy, we ensure the interface feels like a trusted medical institution rather than a generic utility.

---

## 1. Creative North Star: The Digital Clinician
The design system is built on the concept of **"The Digital Clinician."** Every element must feel deliberate, sterile yet inviting, and profoundly organized. We eschew "bubbly" UI in favor of structured layouts, generous whitespace, and a reductionist approach to decoration. If an element does not provide clarity or utility, it is removed.

---

## 2. Color & Tonal Architecture
The palette is rooted in a deep, authoritative teal (`primary: #006A6A`), used as a precise surgical tool rather than a broad brush. 

### The "No-Line" Rule
Standard 1px borders are strictly prohibited for defining sections. Structure must be achieved through **Background Shifts**. 
- Use `surface-container-low` for secondary content areas.
- Use `surface` for the main canvas.
- Separation is created by the contrast between these tokens, ensuring a "seamless" high-end feel.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, physical layers. 
- **Layer 0 (Canvas):** `surface` (#f8fafa)
- **Layer 1 (Sectioning):** `surface-container-low` (#f0f4f5)
- **Layer 2 (Interactive Elements):** `surface-container-lowest` (#ffffff)
- **Layer 3 (Floating/Overlays):** `surface-bright` with 80% opacity and a 12px backdrop blur.

### Signature Textures
Main CTAs or Hero backgrounds should utilize a subtle linear gradient (135°) from `primary` (#006A6A) to `primary-dim` (#005c5c). This adds a "soul" to the brand that flat colors lack, mimicking the sheen of high-quality medical equipment.

---

## 3. Typography: Authoritative Precision
We use a dual-font strategy to balance technical rigor with editorial elegance.

| Level | Token | Font Family | Size | Character |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Manrope | 3.5rem | Bold, Structured |
| **Headline** | `headline-md` | Manrope | 1.75rem | Semi-Bold, Intentional |
| **Title** | `title-lg` | Public Sans | 1.375rem | Medium, Authoritative |
| **Body** | `body-md` | Public Sans | 0.875rem | Regular, Highly Legible |
| **Label** | `label-md` | Public Sans | 0.75rem | All-caps (Opt.), Technical |

**Editorial Note:** Use `manrope` (Headlines) with tight letter-spacing (-0.02em) to create a "locked-in" professional look. Use `publicSans` (Body) with generous line-height (1.6) to ensure clinical data is easy to digest.

---

## 4. Elevation, Depth & Shapes
We reject the "floating card" trend in favor of **Tonal Layering**.

- **The Layering Principle:** Instead of shadows, use token shifts. A card (`surface-container-lowest`) placed on a section (`surface-container-low`) provides enough visual distinction for a premium look.
- **Ambient Shadows:** Shadows are reserved for high-level overlays (e.g., Modals). Use a blur of 24px, an offset of 8px, and a color of `on-surface` at 4% opacity. It should feel like a "whisper" of light, not a dark smudge.
- **The "Ghost Border":** If accessibility requires a border, use `outline-variant` at 15% opacity. Never use 100% opaque borders.
- **Corner Radii:** We use a "Structured Rounding" logic.
    - **Interactive Elements (Buttons/Inputs):** `md` (0.375rem)
    - **Large Containers/Cards:** `lg` (0.5rem)
    - **System Alerts:** `sm` (0.125rem) — sharper corners convey urgency and technicality.

---

## 5. Component Logic

### Buttons
- **Primary:** Gradient background (`primary` to `primary-dim`), `on-primary` text. No shadow.
- **Secondary:** Transparent background, `outline` border (Ghost style), `primary` text.
- **Tertiary:** Text-only, `primary` color, bold weight, no underline until hover.

### Input Fields
- Avoid "boxed" inputs. Use a "Material-Modern" hybrid: a `surface-container-low` background with a 1px `outline-variant` bottom border only. On focus, the border transitions to `primary` at 2px.

### Cards & Lists
- **The "No-Divider" Rule:** Vertical white space (using `spacing-6` or `spacing-8`) must replace divider lines. Content is grouped by proximity and background shifts, never by ruled lines.

### Specialty Healthcare Components
- **Dosage Chips:** Use `secondary-container` with `on-secondary-container` text. Keep corners at `sm` (0.125rem) to look like pharmaceutical labeling.
- **Prescription Timeline:** Use a vertical "Ghost Border" (1px `outline-variant` at 20%) to connect status nodes.

---

## 6. Do’s and Don’ts

### Do
- **Embrace Asymmetry:** Align text to the left but allow imagery or data visualizations to "break the grid" and bleed into margins.
- **Use "Teal as a Scalpel":** Use the `#006A6A` primary color only for the most important action on a screen. 90% of the UI should be neutrals (`surface` and `surface-container`).
- **Focus on Whitespace:** If a screen feels crowded, increase spacing tokens by one level rather than adding borders.

### Don't
- **No Bubbly UI:** Never use `full` (9999px) rounding for buttons; stay within the `md` range.
- **No Pure Blacks:** Always use `on-surface` (#2a3435) for text to maintain a soft, premium contrast.
- **No Illustrations:** Use high-quality, desaturated photography or abstract geometric patterns. Avoid "friendly" cartoon avatars.

---

## 7. Spacing Scale
Layouts must adhere strictly to the 0.7rem increment to maintain rhythmic clinical order.

- **Micro-margin:** `1` (0.35rem)
- **Component Internal Padding:** `3` (1rem)
- **Section Gap:** `8` (2.75rem)
- **Hero/Page Gutter:** `12` (4rem)