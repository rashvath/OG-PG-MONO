**DESIGN & DEVELOPMENT REFERENCE** 

# **Brand & UI Design System** 

**VERSION 1.0  |  NOVEMBER 2026** 



<!-- Start of picture text -->
ae<br>| ae—— FIND * BOOK * MANAGE PGs ——<br><!-- End of picture text -->

#### **One identity. Every interface.** 

The shared reference for the PGINN public website, discovery and booking journeys, resident experience, and PG owner/admin dashboards. 

###### **LOCKED BRAND** 

###### **PROPOSED UI** 

Logo, tagline, six brand colors and font families. Preserve the approved identity. 

Layout, component states, semantic colors, responsive rules and tokens for team adoption. 

PGINN  /  v1.0  /  26 NOV 2026 

01 

**PGINN  /  BRAND & UI DESIGN SYSTEM** 

**01 / IDENTITY** 

### **Logo & usage** 

LOCKED: approved artwork, wordmark and tagline. Do not redraw or rebrand. 



<!-- Start of picture text -->
| ae—— FIND * BOOK * MANAGE PGs ——<br><!-- End of picture text -->

**APPROVED LOCKUP  /  original supplied image** 

###### **Rules for every placement** 

###### **Preserve proportions** 

Use the supplied logo asset. Do not stretch, rotate, recolor, add effects, alter the building symbol or retype the wordmark. 

###### **Protect the mark** 

Proposed minimum clear space: one-quarter of the icon height on all sides. Use the full lockup on white; use only an approved white variant on navy. 

###### **Size & favicon** 

Proposed full lockup minimum: 200 CSS px wide, or larger if the tagline is unreadable. Use approved icon-only artwork in compact UI and favicons. 

###### **Asset handoff** 

The prior locked reference image is reproduced above. Use the original approved SVG/PNG and ICO from the brand kit in production; do not extract a favicon or trace vectors from this PDF. 

Tagline: Find · Book · Manage PGs. Suggested asset names: PGINN-Logo.svg, PGINN-Logo-HD.png, PGINN-Logo-White.svg, PGINN-Favicon.ico and PGINN-App-Icon.svg. 

PGINN  /  v1.0  /  26 NOV 2026 

02 

**PGINN  /  BRAND & UI DESIGN SYSTEM** 

###### **02 / COLOR** 

### **The PGINN palette** 

LOCKED: six exact solid brand colors. Use action blue for text-sized calls to action. 



<!-- Start of picture text -->
Primary blue #0D6EFD Deep navy #06265B<br>Brand accents, iconography, highlights Headings, header/footer, strong contrast<br>Sky blue #E6F2FF White #FFFFFF<br>Subtle selections and information panels Page and component surfaces<br>Ink text #0F172A Action blue #0757CE<br>Body text and dense data Primary buttons, links, focus rings<br><!-- End of picture text -->

###### **Proposed supporting colors** 





<!-- Start of picture text -->
Muted Field border Divider Page<br>#475569 #64748B #CBD5E1 #F8FAFC<br><!-- End of picture text -->

###### **Color discipline** 

Use solid fills only. Never introduce gradients, neon accents or decorative semantic colors. Reserve status colors for feedback and state, not brand decoration. 

PGINN  /  v1.0  /  26 NOV 2026 

03 

**PGINN  /  BRAND & UI DESIGN SYSTEM** 

###### **03 / TYPOGRAPHY** 

### **Type hierarchy** 

LOCKED: Poppins 600–700 for headings; Inter 400–600 for body and interface. Scale below is proposed. 

|**Role**|**Family / weight**|**Size / line (px)**|**Use**|
|---|---|---|---|
|Display|Poppins 700|48 / 56|Marketing hero|
|H1|Poppins 700|36 / 44|Page title|
|H2|Poppins 600|28 / 36|Section title|
|H3|Poppins 600|22 / 28|Card / panel title|
|Body|Inter 400|16 / 24|Descriptions|
|UI / label|Inter 600|14 / 20|Actions, fields|
|Small|Inter 400|12 / 18|Metadata only|



###### **Hierarchy in practice** 

## **Find your next PG** 

##### **Discover verified accommodation** 

Browse available rooms, compare facilities and book your stay with confidence. 

Bengaluru  |  24 properties available 

**View properties** 

Use rem units (16px root), no forced uppercase body text, and 400–600 weights for data. At mobile widths: display 32/40, H1 28/36, H2 24/32. PDF specimens use an installed sans-serif substitute; production must load Poppins and Inter. 

PGINN  /  v1.0  /  26 NOV 2026 

04 

**PGINN  /  BRAND & UI DESIGN SYSTEM** 

**04 / LAYOUT** 

### **Spacing & responsiveness** 

PROPOSED: a 4px spacing foundation with predictable structure for marketing and application screens. 

###### **Spacing scale (CSS px)** 



<!-- Start of picture text -->
4 8 12 16 24 32 48 64<br><!-- End of picture text -->

Use 8–12 for label/control gaps; 16 for field spacing; 24 for card padding and section groups; 32–64 for major sections. Radius: 8px controls, 12px cards, 999px pills. Use 1px borders and restrained solid shadows. 

###### **Responsive layout** 

|**Viewport**|**Grid**|**Gutter**|**Behavior**|
|---|---|---|---|
|0–639px|4 columns|16px|One column; menu drawer; stack actions|
|640–1023px|8 columns|24px|Two cards; collapsible side navigation|
|1024–1439px|12 columns|32px|Persistent sidebar; multi-column|
|1440px+|12 columns|32px|Max content 1280px; center|





**MOBILE TABLET DESKTOP** 

Test at 320px, 375px, 768px, 1024px and 1440px. No page-level horizontal overflow; allow contained table scroll where necessary. 

PGINN  /  v1.0  /  26 NOV 2026 

05 

**PGINN  /  BRAND & UI DESIGN SYSTEM** 

**05 / COMPONENTS** 

### **Actions & forms** 

PROPOSED: accessible, consistent controls for booking, onboarding, and management workflows. 

###### **Button hierarchy / 44px minimum height** 



<!-- Start of picture text -->
Book now Compare Cancel<br>PRIMARY SECONDARY TERTIARY<br>Book now Book now Unavailable<br>HOVER / ACTIVE KEYBOARD FOCUS DISABLED<br><!-- End of picture text -->

Use one primary action per decision group. Use 16px horizontal padding, 8px radius, Inter 600 / 14px. Disable duplicate submission while loading and provide visible progress text. 

###### **Form patterns** 



<!-- Start of picture text -->
Full name Email address<br>Aarav Sharma aarav.example<br><!-- End of picture text -->

Use your legal name. 

Enter a valid email address. 

###### **Room preference** 

Select room type 



<!-- Start of picture text -->
v<br><!-- End of picture text -->

###### **Form behavior** 

Always use visible labels, appropriate input types and autocomplete. Announce validation on submit, identify the error beside its field, preserve input, and move focus to the first invalid field. 

PGINN  /  v1.0  /  26 NOV 2026 

06 

**PGINN  /  BRAND & UI DESIGN SYSTEM** 

**06 / COMPONENTS** 

### **Cards, data & navigation** 

PROPOSED: build reusable patterns for the public marketplace and operational dashboards. 

###### **Card / listing preview** 



<!-- Start of picture text -->
Greenview PG<br>Koramangala, Bengaluru<br>PG PHOTO<br>From Rs. 8,500 / month<br>Available<br><!-- End of picture text -->

**View details** 

###### **Data table / owner dashboard** 

|**Resident**|**Room**|**Amount**|**Status**|
|---|---|---|---|
|Aarav Sharma|A-101|Rs. 8,500|Paid|
|Diya Patel|B-204|Rs. 9,000|Due|
|Neha Singh|A-103|Rs. 8,500|Pending|



Table rows: 44px minimum, semantic headers, sortable column buttons with aria-sort, right-align currency, and pagination. On mobile use card summaries or a labelled scroll region. 

###### **Navigation** 

**PGINN** Find PGs Bookings Manage PG **Menu** 

Web: keep top-level destinations short and show active section. App: use a labelled sidebar on desktop, drawer on small screens. Provide skip link, logical tab order, aria-current="page", and focus management. 

PGINN  /  v1.0  /  26 NOV 2026 

07 

**PGINN  /  BRAND & UI DESIGN SYSTEM** 

###### **07 / ACCESSIBILITY** 

### **States & contrast** 

PROPOSED: target WCAG 2.2 AA across public and authenticated web experiences. 

###### **Status labels** 



<!-- Start of picture text -->
Paid Pending Overdue Info<br>#166534 #92400E #B91C1C #06265B<br>#DCFCE7 #FEF3C7 #FEE2E2 #E6F2FF<br><!-- End of picture text -->

Pair color with clear text and relevant icons. Loading, empty, success and error states must explain what happened and offer a next action when possible. 

###### **Contrast quick reference (calculated)** 

|**Foreground**|**Background**|**Ratio**|**Normal text AA**|
|---|---|---|---|
|#FFFFFF|#0D6EFD|4.50:1|PASS|
|#FFFFFF|#0757CE|6.43:1|PASS|
|#06265B|#FFFFFF|14.62:1|PASS|
|#06265B|#E6F2FF|12.89:1|PASS|
|#0F172A|#FFFFFF|17.85:1|PASS|
|#475569|#FFFFFF|7.58:1|PASS|
|#0757CE|#E6F2FF|5.67:1|PASS|
|#64748B|#FFFFFF|4.76:1|PASS|



Normal text: 4.5:1; large text: 3:1 (24 CSS px regular or approximately 18.67px bold). Necessary control boundaries and meaningful non-text indicators: 3:1. White on primary blue just meets AA; prefer action blue or navy for a larger contrast margin. 

Focus: 2px visible outline with 2px offset; use action blue on light surfaces and white on navy. Use 44px target size as the PGINN default, keyboard access, reduced motion, 200% text zoom and 320px reflow. Test with screen readers. 

Reference: W3C WCAG 2.2  |  https://www.w3.org/TR/WCAG22/ 

PGINN  /  v1.0  /  26 NOV 2026 

08 

**PGINN  /  BRAND & UI DESIGN SYSTEM** 

###### **08 / IMPLEMENTATION** 

### **Developer tokens** 

Use a single source of truth. Locked brand values remain unchanged; supporting UI tokens are proposed. 

```
:root {
  /* LOCKED BRAND */
  --brand-primary: #0D6EFD;  --brand-navy: #06265B;
  --brand-sky: #E6F2FF;      --brand-white: #FFFFFF;
  --text: #0F172A;           --action: #0757CE;
  --font-heading: "Poppins", sans-serif;
  --font-body: "Inter", sans-serif;
  /* PROPOSED UI */
  --muted: #475569;          --border: #64748B;
  --divider: #CBD5E1;        --surface: #F8FAFC;
  --success: #166534;        --success-bg: #DCFCE7;
  --warning: #92400E;        --warning-bg: #FEF3C7;
  --danger: #B91C1C;         --danger-bg: #FEE2E2;
  --space-1: .25rem;         --space-2: .5rem;
  --space-3: .75rem;         --space-4: 1rem;
  --space-6: 1.5rem;         --space-8: 2rem;
  --space-12: 3rem;          --space-16: 4rem;
  --radius-control: .5rem;   --radius-card: .75rem;
  --radius-pill: 999px;      --control: 2.75rem;
  --content-max: 80rem;
  --shadow-card: 0 2px 8px rgb(15 23 42 / 8%);
}
```

###### **Font loading and theme** 

Self-host licensed WOFF2 files for Poppins 600/700 and Inter 400/500/600, or load them from an approved font service. Set font-display: swap and include fallback sans-serif fonts. Use one consistent token file for CSS, component libraries and design handoff. 

###### **No gradient rule** 

Do not use linear-gradient, radial-gradient or gradient text. Solid color surfaces and subtle solid-color shadows are sufficient. Do not infer a dark theme from the navy brand color. 

Fonts: fonts.google.com/specimen/Poppins and fonts.google.com/specimen/Inter. Responsive media queries use 640px, 1024px and 1440px; CSS custom properties cannot directly substitute media-query conditions. 

PGINN  /  v1.0  /  26 NOV 2026 

09 

**PGINN  /  BRAND & UI DESIGN SYSTEM** 

**09 / IMPLEMENTATION** 

### **Reference implementation** 

A compact example for production teams. Reuse tokens and component behavior rather than hardcoding styles. 

```
/* Base and a reusable primary action */
* { box-sizing: border-box; }
body { margin: 0; font: 400 1rem/1.5 var(--font-body);
  color: var(--text); background: var(--surface); }
h1, h2, h3 { font-family: var(--font-heading);
  color: var(--brand-navy); }
.btn { min-height: var(--control); padding: .625rem 1rem;
  border: 1px solid transparent; border-radius: var(--radius-control);
  font: 600 .875rem/1.25rem var(--font-body); cursor: pointer; }
.btn-primary { background: var(--action); color: var(--brand-white); }
.btn-primary:hover, .btn-primary:active { background: var(--brand-navy); }
a { color: var(--action); text-decoration: underline; }
:focus-visible { outline: 2px solid var(--action); outline-offset: 2px; }
.btn:disabled { background: var(--divider); color: var(--muted);
  cursor: not-allowed; }
.grid { display: grid; gap: var(--space-4); grid-template-columns: 1fr; }
@media (min-width: 640px) { .grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .grid { grid-template-columns: repeat(3, 1fr); } }
```

```
<!-- Use the approved asset and semantic controls -->
<link rel="icon" href="/favicon.ico" sizes="any">
<button class="btn btn-primary" type="button">Book now</button>
```

###### **Release checklist** 

Approved logo and favicon used without modification. 

Brand palette, Poppins and Inter loaded; no gradients. 

Tokenized components, all states and responsive screens verified. 

Keyboard, focus, contrast, reflow and screen-reader checks completed. 

Design and development leads approve proposed UI rules before adoption. 

###### **Version governance** 

Keep locked brand changes subject to brand-owner approval. Record proposed UI changes in a versioned changelog and update shared design and code components together. 

PGINN  /  v1.0  /  26 NOV 2026 

10 

