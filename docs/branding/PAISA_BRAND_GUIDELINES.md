# PAISA — BRAND IDENTITY & DESIGN SYSTEM GUIDELINES

**Version:** 1.0  
**Effective Date:** October 31, 2026  
**Document Classification:** Official Brand System  
**Product:** PAISA — Daily Money Reality Check  
**Target Platforms:** Responsive Web, Android, iOS (PWA & Native)  

---

## 1. BRAND ESSENCE & PHILOSOPHY

### 1.1 The Core Truth
> *"Sometimes you don't need a higher salary. You need to understand where your current salary is going."*

In India, everyday spending has shifted to invisible micro-transactions over UPI (Unified Payments Interface), instant delivery apps (Blinkit, Zepto, Instamart), food ordering (Swiggy, Zomato), and cab hailing (Uber, Ola). Money disappears not because people are reckless, but because modern spending friction has approached zero.

**PAISA** does not lecture, judge, or enforce artificial asceticism. Instead, it provides a calm, clear, daily reality check:
- What came in.
- What went out today.
- What remains safe to spend before the next paycheck.

### 1.2 Brand Voice & Personality
- **Grounding, Not Scolding:** PAISA never uses patronizing alerts like *"You failed your budget!"*. It says: *"You've used 82% of today's allowance. Let's adjust tomorrow's plan by ₹200."*
- **Culturally Attuned to India:** Built around Indian salary dates (last working day, 1st, 5th, 7th), UPI transaction patterns, joint family subscriptions, and Indian fiscal norms.
- **Editorial & Warm:** We avoid the cold, neon-purple "crypto-casino" aesthetic and the sterile blue corporate banking look. PAISA feels like a warm, high-end editorial publication printed on premium Japanese sandstone parchment.

---

## 2. BRAND COLOR PALETTE

The PAISA color palette evokes calm clarity, grounded stability, and natural warmth.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRIMARY FOUNDATIONS                          │
├──────────────────┬──────────────────┬───────────────────────────┤
│ Warm Parchment   │ Deep Jet Slate   │ Muted Charcoal Slate      │
│ #FAF8F5          │ #181D26          │ #3D4658                   │
│ Canvas / Base    │ Primary Text     │ Secondary / Body Copy     │
├──────────────────┼──────────────────┼───────────────────────────┤
│ Sandstone Border │ Card Surface     │ Ochre Gold Accent         │
│ #EDE8E0          │ #FFFFFF          │ #D4952B                   │
│ Dividers & Lines │ Floating Cards   │ Key Highlights / Badges   │
└──────────────────┴──────────────────┴───────────────────────────┘
```

### 2.1 Color Specifications Table

| Color Name | HEX | RGB | HSL | Semantic Role |
|---|---|---|---|---|
| **Parchment Base** | `#FAF8F5` | `rgb(250, 248, 245)` | `36°, 33%, 97%` | Full app background, smooth backdrop |
| **Pure Surface** | `#FFFFFF` | `rgb(255, 255, 255)` | `0°, 0%, 100%` | Card containers, modal sheets, popup panels |
| **Sandstone Border** | `#EDE8E0` | `rgb(237, 232, 224)` | `37°, 27%, 90%` | Subtle container borders, table grid lines |
| **Deep Jet Slate** | `#181D26` | `rgb(24, 29, 38)` | `219°, 23%, 12%` | Main headings, primary buttons, high-contrast numbers |
| **Charcoal Slate** | `#3D4658` | `rgb(61, 70, 88)` | `220°, 18%, 29%` | Descriptive body copy, subtitle text |
| **Muted Grey Slate** | `#7F899F` | `rgb(127, 137, 159)` | `221°, 15%, 56%` | Meta captions, timestamp labels, field place holders |
| **Ochre Gold** | `#D4952B` | `rgb(212, 149, 43)` | `38°, 66%, 50%` | Brand emblem, active navigation accents, badges |
| **Golden Sand** | `#F0D49C` | `rgb(240, 212, 156)` | `40°, 73%, 78%` | Selection highlights, soft pill badges, hover glows |
| **Forest Sage (Green)**| `#2E8B57` | `rgb(46, 139, 87)` | `146°, 50%, 36%` | Income entries, positive surplus, within-budget gauges |
| **Terracotta (Red)** | `#E06D53` | `rgb(224, 109, 83)` | `11°, 70%, 60%` | Expenses, budget warning thresholds, payment overdue |
| **Cobalt Lake (Blue)** | `#3B82F6` | `rgb(59, 130, 246)` | `217°, 91%, 60%` | Bank integrations, statement sync, informational notes |

---

## 3. TYPOGRAPHY SYSTEM

PAISA uses two complementary typography families:
1. **Plus Jakarta Sans** — For all editorial titles, interactive UI controls, buttons, forms, and general body copy.
2. **JetBrains Mono** — For financial figures, transaction amounts, account numbers, and percentage calculations to ensure vertical alignment of numbers.

```
Typography Hierarchy:
- App Title / Hero Header:    Plus Jakarta Sans 900 (Black), -0.03em tracking
- Section Header:             Plus Jakarta Sans 800 (ExtraBold), -0.02em tracking
- Card Title / Label:         Plus Jakarta Sans 700 (Bold)
- Body Copy:                  Plus Jakarta Sans 400 (Regular) / 500 (Medium)
- Financial Figures / Money:  JetBrains Mono 700 (Bold), tabular-nums
```

---

## 4. LOGO & SYMBOL SPECIFICATIONS

The PAISA mark is an organic, geometric leaf emblem representing mindful financial growth, balance, and natural abundance.

### 4.1 Primary Logo
- **Mark:** Stylized continuous leaf curve filled with the Ochre Gold linear gradient (`#D4952B` to `#E5AB4B`).
- **Wordmark:** "PAISA" set in uppercase Plus Jakarta Sans Black (900 weight), tracking `-0.04em`, Deep Jet Slate (`#181D26`).
- **Clear Space:** Minimum clear space around the logo must equal the height of the letter "P" on all four sides.

### 4.2 Incorrect Logo Usage (Strictly Prohibited)
- ❌ Do NOT stretch, rotate, or distort the proportions of the leaf mark.
- ❌ Do NOT place the dark logo on busy photographic backgrounds without an opaque container.
- ❌ Do NOT render the leaf in garish neon green or multi-color gradients.
- ❌ Do NOT add heavy drop shadows, outer glows, or 3D beveled effects.

---

## 5. COMPONENT & UI PATTERNS

### 5.1 Primary Button (`btn-primary`)
- **Background:** Deep Jet Slate (`#181D26`)
- **Text Color:** Pure White (`#FFFFFF`), font weight 700 (Bold)
- **Border Radius:** `12px` (rounded-xl)
- **Hover State:** Background shifts to `#2A3241` with a subtle elevation lift
- **Active State:** Scale transforms to `0.98` for tactile haptic feedback

### 5.2 Secondary Button (`btn-secondary`)
- **Background:** Pure White (`#FFFFFF`)
- **Border:** `1px solid #EDE8E0` (Sandstone)
- **Text Color:** Deep Jet Slate (`#181D26`), font weight 600 (SemiBold)
- **Hover State:** Background shifts to `#F5F2EB`

### 5.3 Editorial Cards (`editorial-card`)
- **Background:** Pure White (`#FFFFFF`)
- **Border:** `1px solid #EDE8E0`
- **Border Radius:** `20px` (rounded-2xl)
- **Shadow:** Ultra-subtle diffuse shadow `0 2px 8px -2px rgba(24, 29, 38, 0.04)`

---

## 6. BRAND POSITIONING & COPY GUIDANCE

### Taglines
- **Primary Tagline:** *Your Daily Money Reality Check.*
- **Secondary Tagline:** *Small steps today, bigger freedom tomorrow.*
- **Technical Tagline:** *Integer-exact personal finance, engineered for Indian salary cycles.*

### Short Description (50 Words)
PAISA is India's calm personal finance manager that brings clarity to your salary. With real-time daily budget reality checks, Indian bank statement imports, integer-exact paise calculations, and privacy-first local storage, PAISA helps you understand where your money went without ever requesting your banking passwords.

### Long Description (150 Words)
Most budgeting apps fail because they lecture you at the end of the month when your money is already spent. PAISA changes the game by translating your monthly salary into an intuitive daily spending allowance. Every UPI transaction, food delivery, and recurring subscription updates your reality check in real time.

Built specifically for Indian consumers, PAISA supports direct bank statement parsing (CSV & JSON) from SBI, HDFC, ICICI, Axis, Kotak, and more, with automated merchant tagging for Swiggy, Blinkit, Zepto, and Uber. With zero banking password requirements, client-side encryption, and exact integer paise arithmetic, PAISA is the fastest, safest way to master your daily cash flow.
