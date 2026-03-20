```markdown
# Design System Specification: The Informed Shadow

## 1. Overview & Creative North Star
The DevSecOps landscape is often cluttered with "hacker" clichés—neon greens and terminal-style aesthetics that prioritize grit over clarity. This design system rejects the stereotype in favor of **"The Informed Shadow."** 

Our Creative North Star is a high-end, editorial-tech hybrid. It treats technical education as a premium experience, using deep tonal depth and sophisticated typography to guide the user through complex security architectures. We move beyond the "standard dashboard" by utilizing intentional asymmetry, overlapping layers, and a strict "No-Line" philosophy. The result is a platform that feels like a physical console carved from obsidian and light—authoritative, breathable, and deeply technical.

---

## 2. Colors: Tonal Architecture
The palette is rooted in a deep, nocturnal foundation, punctuated by vibrant severity markers that act as digital beacons.

### The Foundation
*   **Background (`#0c0e16`):** Our absolute floor. It provides the deep contrast required for high-end digital interfaces.
*   **Primary (`#9aa8ff`):** A sophisticated Slate Blue that serves as our primary action color. It should be used for critical focus points and interactive states.
*   **Secondary/Tertiary (Severity):** 
    *   **Critical:** `error` (`#ff6e84`)
    *   **High:** `secondary` (`#ff8f06`)
    *   **Medium:** `tertiary` (`#ff7161`)
    *   **Low:** `primary_fixed` (`#96a5ff`)

### The "No-Line" Rule
Traditional UI relies on 1px solid borders to define sections. This system **prohibits** them. Structural boundaries must be defined solely through background color shifts. 
*   **Implementation:** If a sidebar needs to be separated from the main content, place a `surface-container-low` (`#11131c`) panel against the `surface` (`#0c0e16`) background. The "edge" is created by the change in value, not a line.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. 
*   **Base:** `surface`
*   **Sectioning:** `surface-container-low`
*   **Cards/Modals:** `surface-container-high` (`#1d1f2a`)
*   **Floating Elements:** `surface-container-highest` (`#222531`)

### The "Glass & Gradient" Rule
To inject "soul" into the dark theme:
*   **Glassmorphism:** For overlays, use a semi-transparent `surface-variant` (`#222531` at 70% opacity) with a `backdrop-blur` of 12px-20px. 
*   **Signature Textures:** Main CTAs or active "Learning Tracks" should use a subtle linear gradient from `primary` (`#9aa8ff`) to `primary_container` (`#8c9bf3`) at a 135-degree angle.

---

## 3. Typography: Editorial Technicality
We utilize a dual-font strategy to balance high-end editorial feel with technical precision.

*   **Display & Headline (Space Grotesk):** This is our "Signature" voice. Its quirky, geometric terminals feel modern and slightly avant-garde. Use `display-lg` for landing hero sections to create an immediate sense of premium quality.
*   **Body & Title (Inter):** The workhorse. Inter provides unmatched readability at small sizes for educational content. 
*   **Technical Data (JetBrains Mono):** All code snippets, IP addresses, and terminal outputs must use JetBrains Mono. It communicates "System Output" instantly.

**Visual Hierarchy Tip:** Use `label-md` in all-caps with increased tracking (0.05em) for category tags or metadata to give them an authoritative, "spec-sheet" appearance.

---

## 4. Elevation & Depth: Tonal Layering
Depth is not a shadow; it is a relationship between light and surface.

*   **The Layering Principle:** Place a `surface-container-lowest` (`#000000`) element inside a `surface-container-high` card to create a "recessed" area for code blocks or data tables.
*   **Ambient Shadows:** For floating modals, use a shadow with a 40px-60px blur and 8% opacity. The shadow color should be a tinted version of the primary color (`#4958ac`) rather than black, mimicking a subtle glow from the "console" lights.
*   **The "Ghost Border" Fallback:** If accessibility requirements demand a border (e.g., in high-contrast mode), use a "Ghost Border": the `outline-variant` token at 15% opacity. Never use 100% opaque borders.

---

## 5. Components: Behavioral Primitives

### Buttons
*   **Primary:** Solid `primary` background with `on-primary` text. Use `rounded-md` (0.75rem).
*   **Secondary:** `surface-container-highest` background with `on-surface` text. No border.
*   **Tertiary:** Transparent background, `primary` text. Underline only on hover.

### Cards & Lists
*   **Forbid Dividers:** Do not use horizontal lines to separate list items. Use 1.5rem (`spacing-6`) of vertical white space or a subtle `surface-variant` background shift on hover.
*   **Padding:** Use a generous `spacing-5` (1.25rem) for internal card padding to ensure educational content has room to breathe.

### Input Fields
*   **Styling:** Use `surface-container-low` for the field background. On focus, transition the background to `surface-container-highest` and add a subtle 2px bottom "accent" of the `primary` color.
*   **Rounding:** Use `rounded-DEFAULT` (0.5rem).

### Severity Badges
*   Use a "soft-fill" approach: A low-opacity version of the severity color (e.g., `error_container` at 20%) for the badge background, with high-saturation text (`on_error_container`) for legibility.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use `JetBrains Mono` for any technical string, even within a sentence (e.g., "Target the `192.168.1.1` endpoint").
*   **Do** use asymmetrical layouts. A 2/3 column for content paired with a 1/3 column for metadata creates an editorial feel.
*   **Do** leverage `rounded-xl` for large educational hero images to make them feel integrated and "friendly."

### Don't
*   **Don't** use pure white (`#FFFFFF`) for body text. Use `on_surface` (`#e4e4f0`) to reduce eye strain in the dark environment.
*   **Don't** use standard 1px borders. If you feel the need for a line, try a 4px vertical "accent bar" using the `primary` color instead.
*   **Don't** crowd the interface. If a screen feels busy, increase the spacing from `spacing-4` to `spacing-8`. Space is a luxury; use it.

---

## 7. Iconography
Utilize **Lucide** or **Phosphor** (Thin or Light weight). 
*   **Technical Context:** Icons for "Scanners" or "Reports" should use the `outline` token color at 0.75 opacity to remain secondary to the text labels.
*   **Interactive Context:** Actionable icons (e.g., "Run Script") should use the `primary` color.```