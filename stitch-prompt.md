# Stitch Prompt — Zybe Website Audit Tool

Paste the block below into Stitch. It's written screen-by-screen with a committed
aesthetic so the output feels designed, not generic.

---

## THE PROMPT

Design a clean, premium web app called **Zybe** — a free website audit tool that
grades any business's website and hands back an intelligent report. The product
flow is three moments: **capture email → enter their domain → reveal the full
audit.** Design all three screens plus the report as one cohesive product.

### Aesthetic direction
Refined, confident, "quiet-luxury SaaS." Think a boutique growth agency's internal
tool — trustworthy, editorial, and calm, not loud or startup-y. Reject generic AI
looks: no purple-on-white gradients, no Inter/Roboto, no cookie-cutter hero.

- **Mood:** bright, airy, off-white canvas with lots of negative space; one deep,
  saturated accent doing the heavy lifting.
- **Palette:** warm paper white background (`#FAF9F6`), near-black ink text
  (`#141414`), and a single striking accent — **deep electric teal / `#0BA37F`** —
  used sparingly for scores, CTAs, and active states. Soft neutral card borders
  (`#EAE8E1`). Score states use a restrained system: emerald (good), amber (fair),
  coral-red (needs work).
- **Typography:** a characterful display serif or grotesque for headlines (e.g.
  something like *Fraunces*, *Editorial New*, or *GT Sectra*), paired with a clean
  humanist sans for body (e.g. *Geist*, *Satoshi*, or *General Sans*). Large,
  tight-leading headlines; generous body line-height.
- **Texture & depth:** subtle grain/noise over the background, soft layered
  shadows on cards (not heavy drop-shadows), 16–20px rounded corners, hairline
  1px borders. One abstract organic gradient-mesh blob in teal/mint, blurred, sits
  behind the hero for atmosphere.
- **Motion feel:** staggered fade-up reveals on load; score numbers count up; the
  score ring animates as it fills.

### Screen 1 — Email capture (landing)
Centered, single-column, spacious. Small wordmark "Zybe" top-left with a minimal
geometric mark. A short editorial headline: **"See what your website is really
doing for you."** One supporting line: "A free, no-nonsense audit of your site's
health, SEO, and business signals." Below it, a single clean email input with a
teal **"Start my audit →"** button inline. A tiny trust row under it: "Free ·
No spam · Results in ~30 seconds." Behind everything, the blurred teal mesh blob
and faint grain. Feels like the whole page is one calm invitation.

### Screen 2 — Domain input
Same canvas, feels like step 2 of a wizard (a slim progress hint: ● ● ○).
Headline: **"Which website should we audit?"** A prominent URL input prefixed
with a small globe icon and a `https://` hint, placeholder `yourcompany.com`.
Teal **"Run audit"** button. Below, three tiny reassurance chips with icons:
"We only read your homepage," "No login required," "Nothing is stored publicly."
Keep it minimal and confident — this is a 5-second screen.

### Screen 2.5 — Scanning state
A brief, elegant loading screen: the domain shown as a pill, and an animated
checklist ticking through live steps — "Fetching homepage… Reading SEO signals…
Profiling the business… Scoring…" — each line resolving to a small teal check.
A thin indeterminate progress bar in teal. Makes the wait feel like work is
happening.

### Screen 3 — The audit report (the hero screen)
A wide, editorial dashboard on the paper-white canvas. Sticky slim top bar:
"← Back" left, "Zybe audit" right. Layout, top to bottom:

1. **Report hero card:** big card, left side has an eyebrow "WEBSITE AUDIT REPORT",
   the domain as a large serif headline (`acmecoffee.com`), and a subtitle line
   with industry + business stage ("Specialty coffee retail · Growth stage").
   Right side: a large **circular score ring** (0–100) with the number counting up,
   color-coded (e.g. 78 in emerald), and a "Good / Fair / Needs work" label beneath.

2. **Business profile card:** icon + "Business profile" heading, a 2–3 sentence
   AI summary, then a 3-up grid of stat tiles: Industry · Business stage · Target
   audience.

3. **Category scores:** a grid of category cards (SEO, Performance, Content,
   Trust & Credibility, Mobile, Technical). Each card: category name, a big score,
   and a thin horizontal progress bar tinted by its score band. Sorted best→worst.

4. **Key findings / AI insights:** a two-column list of "What's working" (teal
   check bullets) vs "What to fix" (amber/coral bullets), each item one crisp line.

5. **Competitor snapshot:** a compact comparison — "You vs. 3 competitors" — small
   bars or a simple table showing where this site leads or trails.

6. **SEO & niche opportunities:** a card with 3–4 recommended focus keywords/topics
   as pill tags, plus a one-line "biggest opportunity" callout.

7. **Bottom CTA band:** a full-width teal-tinted panel: **"Want Zybe to fix these?"**
   with a "Book a free call" button and a small contact line. Ends the report on a
   confident, human note.

### Rules
- Everything on the warm paper-white canvas; teal is the ONLY vivid color, used
  intentionally. Neutrals do the rest.
- Cards: 1px `#EAE8E1` borders, soft shadow, ~18px radius, generous inner padding.
- Data-dense but never cramped — lean on whitespace and clear hierarchy.
- Desktop-first, but show the report gracefully stacked on mobile.
- Make the score ring and the report hero the two most memorable, screenshot-worthy
  moments.
