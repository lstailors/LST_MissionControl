# 🎨 AEGIS Desktop — فروقات التصميم التصوري vs التطبيق الفعلي

> هذا المستند يحدد كل الفروقات البصرية بين التصميم التصوري (aegis-desktop-concept.jsx)
> والتطبيق الفعلي، مع تعليمات إصلاح دقيقة لكل نقطة.

---

## 1. خلفية التطبيق — Ambient Glow مفقود ❌

**التصميم التصوري:**
```jsx
// خلفية #0a0e17 + توهجان radial gradient كتأثير جوّي:
background: "#0a0e17"

// توهج Teal أعلى يمين
{ position: "absolute", top: -200, right: -200, width: 600, height: 600,
  background: "radial-gradient(circle, rgba(0,229,255,0.04) 0%, transparent 70%)" }

// توهج Purple أسفل يسار
{ position: "absolute", bottom: -300, left: -100, width: 500, height: 500,
  background: "radial-gradient(circle, rgba(213,0,249,0.03) 0%, transparent 70%)" }
```

**التطبيق الفعلي:** خلفية `#0d1117` فقط — بدون أي توهج ambient.

**الإصلاح:**
```
ملف: src/components/Layout/AppLayout.tsx

أضف div واحد خلف كل المحتوى (أول child في الـ layout wrapper):

<div className="pointer-events-none absolute inset-0 overflow-hidden">
  {/* Teal glow — top right */}
  <div className="absolute -top-[200px] -right-[200px] w-[600px] h-[600px]
    bg-[radial-gradient(circle,rgba(78,201,176,0.04)_0%,transparent_70%)]" />
  {/* Purple/Blue glow — bottom left */}
  <div className="absolute -bottom-[300px] -left-[100px] w-[500px] h-[500px]
    bg-[radial-gradient(circle,rgba(108,159,255,0.03)_0%,transparent_70%)]" />
</div>

تأكد إن الـ layout wrapper عنده position: relative
```

---

## 2. TitleBar — معلومات ناقصة ❌

**التصميم التصوري:**
```
الجهة اليمنى تعرض: "Opus 4.6 · 134K / 200K · ● Connected"
```

**التطبيق الفعلي:** يعرض فقط الشعار + اسم التطبيق + الإصدار + أزرار النافذة. ما فيه معلومات Model + Context + Status في الـ TitleBar.

**الإصلاح:**
```
ملف: src/components/TitleBar.tsx

أضف قسم معلومات بين الشعار وأزرار النافذة:

<div className="flex items-center gap-3 text-[11px] text-aegis-text-dim">
  <span>Opus 4.6</span>
  <span className="opacity-30">·</span>
  <span>{tokenUsage?.used || '—'} / {tokenUsage?.total || '200K'}</span>
  <span className="opacity-30">·</span>
  <span className={connected ? 'text-aegis-success' : 'text-aegis-danger'}>
    ● {connected ? 'Connected' : 'Disconnected'}
  </span>
</div>

اقرأ tokenUsage من chatStore (نفس ما يسويه NavSidebar).
```

---

## 3. GlassCard — الشفافيات ثقيلة ❌

**التصميم التصوري:**
```jsx
background: "rgba(255,255,255,0.03)"    // خفيف جداً
border: "1px solid rgba(255,255,255,0.06)"
borderRadius: 16
backdropFilter: "blur(20px)"
// hover:
background: "rgba(255,255,255,0.06)"
transform: "translateY(-2px)"
```

**التطبيق الفعلي:** يستخدم `bg-aegis-surface/40` وهو أثقل بكثير.

**الإصلاح:**
```
ملف: components/shared/GlassCard.tsx

غيّر الـ classes:
- bg-aegis-surface/40 → bg-white/[0.03]
- border-aegis-border/15 → border-white/[0.06]
- تأكد: backdrop-blur-xl موجود (≈ blur 24px, قريب من 20px)
- rounded-2xl (= 16px ✅)

الـ hover state:
- hover:bg-white/[0.06]
- hover:-translate-y-0.5 (= translateY(-2px))
```

---

## 4. NavSidebar — عرض + User Avatar ❌

### 4a. العرض
**التصميم التصوري:** `width: 64px`
**التطبيق الفعلي:** `w-[60px]`

**الإصلاح:** غيّر `w-[60px]` → `w-16` (= 64px)

### 4b. User Avatar "R" أسفل السايدبار

**التصميم التصوري:**
```jsx
{ width: 36, height: 36, borderRadius: 10,
  background: "linear-gradient(135deg, #00e5ff20, #d500f920)",
  border: "1px solid rgba(255,255,255,0.08)",
  fontSize: 14, fontWeight: 800, color: "#00e5ff" }
// يعرض حرف: "R"
```

**التطبيق الفعلي:** ما فيه user avatar.

**الإصلاح:**
```
ملف: NavSidebar.tsx

فوق زر Settings، أضف:

<div className="flex justify-center mb-2">
  <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-aegis-primary/12 to-aegis-accent/12
    border border-white/[0.08] flex items-center justify-center
    text-sm font-extrabold text-aegis-primary">
    R
  </div>
</div>
```

---

## 5. AgentHub — تصميم مختلف تماماً ❌

**التصميم التصوري:**
```
grid-cols-4 (4 أعمدة)

كل Agent:
┌─────────────┐
│     [A]     │  ← Letter avatar (56x56, borderRadius 16)
│   + dot     │  ← Status dot أسفل يمين الـ avatar
│  Aegis Core │  ← اسم (14px, font-700)
│  المنسق العام │  ← دور عربي (11px, dim, RTL)
│ Tasks: 24 ● │  ← tasks + status badge
└─────────────┘

Avatar style:
  width: 56, height: 56, borderRadius: 16,
  background: linear-gradient(135deg, ${color}25, ${color}08),
  border: 2px solid ${color}30,
  fontSize: 22, fontWeight: 800, color: agent.color

Status dot:
  position: absolute, bottom: -2, right: -2,
  width: 14, height: 14, borderRadius: 50%,
  border: 2px solid #0a0e17 (= bg color)
  active: #00e676 + glow | idle: #ff9100 | sleeping: #424242

Status badge:
  fontSize: 9, textTransform: uppercase, fontWeight: 700,
  active: bg rgba(0,230,118,0.1) color #00e676
  idle: bg rgba(255,255,255,0.04) color #ff9100
  sleeping: bg rgba(255,255,255,0.04) color rgba(255,255,255,0.25)

كل الكروت: text-center, padding: 20
```

**التطبيق الفعلي:** grid-cols-2 + emojis + AEGIS يمتد عمودين.

**الإصلاح:**
```
ملف: pages/AgentHub.tsx

1. Grid: grid-cols-2 → grid-cols-2 lg:grid-cols-4
2. Avatar: إيموجي → أول حرف من الاسم بالستايل أعلاه
3. AEGIS ما يمتد عمودين — كل الوكلاء نفس الحجم
4. text-center لكل card
5. Status dot أسفل يمين الـ avatar (بدل مكان ثاني)
```

---

## 6. Dashboard — Header + Stats Details ❌

### 6a. Page Header

**التصميم التصوري:**
```
يسار: <h1>Dashboard</h1> (28px, font-800, tracking: -1)
       <p>AEGIS Desktop v2.0 — Opus 4.6 Connected</p> (13px, opacity 0.35)
يمين: StatusDot(active) + "All Systems Operational" (12px, #00e676)
```

**الإصلاح:** أضف header row بنفس التنسيق أعلاه.

### 6b. Stats Grid

**التصميم التصوري:** كل stat card:
```
- Label: uppercase, 11px, tracking-[1px], rgba(255,255,255,0.35)
- Value: 28px, font-800, tracking: -1, color = stat.color (مو أبيض!)
- Icon: أعلى يمين، 24px, opacity 0.15
- Sparkline: تحت القيمة، marginTop: 12
```

**الإصلاح:**
```
ملف: pages/Dashboard.tsx

تأكد إن StatCard يطابق:
- القيمة ملونة بلون الـ stat (مو text-aegis-text)
- الأيقونة opacity-15 أعلى يمين
- Label uppercase مع letter-spacing
```

### 6c. القسم السفلي (3 أعمدة)

**التصميم التصوري:**
```
[Context Window]    [Quick Actions]    [Recent Sessions]
  ProgressRing       4 action rows      4 session rows
  (100px, centered)  (مع سهم ←)        (title + time + token badge)
```

**الإصلاح:** تأكد إن الـ grid تحت الـ stats = grid-cols-3

---

## 7. CostTracker — Total Card ❌

**التصميم التصوري:**
```
┌──────────────────────────────────────────────┐
│ TOTAL THIS MONTH                   ○ ○ ○ ○  │
│ $70.00                          ProgressRings│
│ (42px, font-800, teal, tracking:-2)  (64px)  │
└──────────────────────────────────────────────┘
```

**الإصلاح:**
```
ملف: pages/CostTracker.tsx

Total card:
- flex justify-between items-center
- يسار: label (11px, uppercase, tracking-[1px]) + رقم (text-4xl font-extrabold tracking-tighter text-aegis-primary)
- يمين: flex gap-3 مع ProgressRings (size=64) لكل model
```

---

## 8. Scrollbar — ألوان محايدة ❌

**التصميم التصوري:**
```css
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
```

**التطبيق الفعلي:** teal-tinted scrollbar.

**الإصلاح:** في index.css غيّر الـ scrollbar thumb لألوان white/opacity محايدة.

---

## 9. MemoryExplorer — Color Bar ❌

**التصميم التصوري:** كل memory entry فيها شريط لوني عمودي (6px × 32px, borderRadius 3).

**الإصلاح:**
```
أول element في كل memory card:
<div className="w-1.5 h-8 rounded-sm shrink-0" style={{ background: categoryColor }} />
```

---

## 10. Workshop — Column Container ❌

**التصميم التصوري:**
```
كل عمود:
- container: rgba(255,255,255,0.02), borderRadius 16, padding 16, border rgba(255,255,255,0.04)
- header: colored dot (8px) + title (14px, font-700) + count badge
- separator: border-bottom 2px solid ${color}20
```

**الإصلاح:** تأكد إن column containers تطابق الستايل أعلاه.

---

## 📋 ملخص الأولويات

| # | التغيير | الأثر البصري | الصعوبة |
|---|---------|-------------|---------|
| 1 | Ambient Glow في الخلفية | 🔥🔥🔥 كبير جداً | سهل |
| 3 | GlassCard شفافيات أخف | 🔥🔥🔥 كبير | متوسط |
| 5 | AgentHub grid-cols-4 + Letter Avatars | 🔥🔥🔥 كبير | متوسط |
| 2 | TitleBar معلومات (Model + Tokens + Status) | 🔥🔥 متوسط | سهل |
| 6 | Dashboard header + stats layout | 🔥🔥 متوسط | متوسط |
| 7 | CostTracker Total card layout | 🔥🔥 متوسط | سهل |
| 4 | NavSidebar 64px + User Avatar | 🔥 خفيف | سهل |
| 8 | Scrollbar ألوان محايدة | 🔥 خفيف | سهل |
| 9 | MemoryExplorer color bar | 🔥 خفيف | سهل |
| 10 | Workshop column styling | 🔥 خفيف | سهل |

---

## 🎯 ترتيب التنفيذ (ابدأ بالأثر الأكبر):

```
المجموعة 1 (الأثر الأكبر):
  1 → Ambient Glow (أكبر فرق — دقيقة وحدة)
  3 → GlassCard شفافيات (يغيّر شكل كل كرت في التطبيق)
  5 → AgentHub redesign (صفحة كاملة مختلفة)

المجموعة 2 (تفاصيل مهمة):
  2 → TitleBar info (يملأ الفراغ)
  6 → Dashboard layout (header + stats)
  7 → CostTracker Total card

المجموعة 3 (تفاصيل صغيرة — batch واحد):
  4 → NavSidebar 64px + avatar
  8 → Scrollbar
  9 → MemoryExplorer color bar
  10 → Workshop columns
```

حدّث EXECUTION-PLAN.md بعد كل مجموعة ✅
