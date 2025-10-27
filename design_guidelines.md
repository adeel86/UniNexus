# UniNexus Design Guidelines

## Design Approach: Reference-Based (Social Media + Professional Platforms)

**Primary References:** Instagram (social feed), LinkedIn (professional profiles), Discord (community channels), Duolingo (gamification)

**Rationale:** UniNexus combines social networking with professional development, requiring vibrant Gen Z aesthetics while maintaining credibility for university/industry users. The platform is experience-focused with rich visual content and strong emotional engagement drivers.

---

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Primary: `266 77% 70%` (violet #8B5CF6)
- Secondary: `189 94% 43%` (cyan #06B6D4) 
- Accent: `348 83% 47%` (rose #F43F5E)
- Background: `0 0% 100%` (white)
- Surface: `240 5% 96%` (light gray)
- Text Primary: `222 47% 11%` (near black)
- Text Secondary: `215 16% 47%` (gray)

**Dark Mode:**
- Primary: `266 77% 70%` (violet - same)
- Secondary: `189 94% 43%` (cyan - same)
- Accent: `348 83% 47%` (rose - same)
- Background: `222 47% 11%` (dark navy)
- Surface: `217 33% 17%` (elevated dark)
- Text Primary: `210 40% 98%` (near white)
- Text Secondary: `217 20% 60%` (light gray)

**Gradient Treatments:**
- Hero gradients: violet-to-cyan diagonal (from-violet-500 to-cyan-400)
- Card accents: subtle violet-to-rose (from-violet-500/20 to-rose-500/20)
- Score/gamification: cyan-to-violet radial

### B. Typography

**Font Families:**
- Primary: 'Inter' (body text, UI elements)
- Display: 'Poppins' (headings, hero text, branding)

**Type Scale:**
- Hero/Display: text-6xl to text-8xl (Poppins, font-bold)
- H1: text-4xl to text-5xl (Poppins, font-semibold)
- H2: text-3xl to text-4xl (Poppins, font-semibold)
- H3: text-2xl to text-3xl (Poppins, font-medium)
- Body Large: text-lg (Inter, font-normal)
- Body: text-base (Inter, font-normal)
- Small: text-sm (Inter, font-normal)
- Caption: text-xs (Inter, font-medium, uppercase tracking)

### C. Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 8, 12, 16, 20, 24 (p-2, m-4, gap-8, py-12, px-16, space-y-20, mt-24)

**Container Widths:**
- Feed/Content: max-w-2xl (central column)
- Wide sections: max-w-7xl
- Profile cards: max-w-md
- Modals/Dialogs: max-w-lg to max-w-2xl

**Responsive Breakpoints:**
- Mobile-first approach
- sm: 640px (tablet adjustments)
- md: 768px (tablet landscape)
- lg: 1024px (desktop)
- xl: 1280px (wide desktop)

**Grid Patterns:**
- Feed: Single column on mobile, sidebar layout on lg+ (70/30 split)
- Channel cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Profile showcase: grid-cols-2 md:grid-cols-3 lg:grid-cols-4
- Leaderboard: Single column with rank indicators

### D. Component Library

**Navigation:**
- Fixed top navbar: glassmorphic (backdrop-blur-xl bg-white/80 dark:bg-gray-900/80)
- Mobile: bottom tab bar with icons
- Desktop: top horizontal nav with search bar centered

**Cards:**
- Post cards: rounded-2xl shadow-lg with subtle border
- Course channels: rounded-xl with gradient border-top
- Profile cards: rounded-3xl with glassmorphic overlay
- Elevation: Use shadow-sm, shadow-md, shadow-lg, shadow-2xl

**Buttons:**
- Primary CTA: rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 px-8 py-3
- Secondary: rounded-full border-2 border-violet-500 backdrop-blur
- Icon buttons: rounded-full p-3 with hover:scale-110 transition
- Floating action button: fixed bottom-20 right-8 rounded-full shadow-2xl (mobile: bottom-24)

**Forms & Inputs:**
- Text inputs: rounded-xl border-2 focus:ring-4 focus:ring-violet-500/20
- Dark mode: bg-gray-800 border-gray-700 text-white
- Dropdowns: rounded-lg with smooth slide animation
- Checkboxes/Radio: Custom styled with brand colors

**Social Elements:**
- Like/Heart: Animated scale with rose fill
- Comment bubble: Cyan stroke with counter badge
- Share: Violet circular ripple effect
- Save/Bookmark: Toggle with smooth rotation
- Endorsement badges: Rounded pills with gradient backgrounds

**Feed Components:**
- Infinite scroll loader: Animated gradient skeleton
- Post composer: Expandable textarea with media upload zone
- Hashtag pills: rounded-full bg-violet-500/10 text-violet-600
- User mentions: @username with hover card preview

**AI Assistant:**
- Chat bubble: rounded-2xl with tail, alternating alignment
- AI responses: Gradient border-left-4 with typing indicator
- Suggestion chips: rounded-full interactive pills

**Gamification:**
- UniNexus Score: Circular progress ring with gradient stroke
- Leaderboard cards: Rank badge with gradient background (#1 gold, #2 silver, #3 bronze)
- Achievement badges: Icon + label in rounded-lg containers
- Point counters: Animated number with sparkle effect

**Portfolio:**
- Project cards: Image overlay with gradient scrim
- Skill tags: Multi-select pills with remove animation
- Achievement timeline: Vertical line with milestone markers

### E. Visual Effects

**Glassmorphism:** Apply to cards over images/gradients
```
backdrop-blur-xl bg-white/70 dark:bg-gray-900/70
border border-white/20
```

**Animations (Minimal, Strategic Use):**
- Page transitions: Fade + subtle slide (Framer Motion)
- Button hovers: Scale 1.05 with 200ms ease
- Card hovers: Lift with shadow-xl (translateY -2px)
- Like animation: Heart pop with scale + color transition
- Score updates: Number counter with flash effect
- Loading states: Gradient shimmer skeletons

---

## Images

**Hero Section:**
- Large hero image showing diverse students collaborating on campus
- Overlay: Gradient scrim (from-violet-900/60 to-transparent) for text legibility
- Position: Background, full-width, min-h-screen on landing page

**Profile Sections:**
- User avatars: Circular with gradient ring borders
- Cover photos: 16:9 ratio with blur-to-focus transition
- Portfolio images: Grid layout with hover zoom

**Feed Content:**
- Post images: Max height constraint, rounded-xl, clickable lightbox
- Video thumbnails: Play button overlay with blur background
- Shared content: Preview cards with 1200x630 og:image format

**Channel Headers:**
- University/Course banners: Wide format (3:1) with institution branding
- Icon representations for topics (use icon libraries, not custom SVG)

**Industry Dashboard:**
- Company logos: Grayscale with color on hover
- Placeholder portraits for mock recruiter profiles

---

## Page-Specific Guidelines

**Home Feed:** Centered max-w-2xl feed, floating compose button, sticky top filters, infinite scroll
**Course Channels:** Grid of channel cards, each with member count and recent activity preview
**Q&A Section:** Stack Exchange-inspired layout, upvote buttons left-aligned, accepted answer highlight
**Profile/Portfolio:** Hero cover + circular avatar, tabbed sections (About/Projects/Activity), CTA for industry users
**Leaderboard:** Podium visual for top 3, then ranked list with score bars
**AI Chat:** Full-height chat interface, input fixed bottom, suggested prompts as chips
**Events Calendar:** Card-based event list, date picker sidebar, RSVP status badges
**Login/Onboarding:** Split-screen design (left: branding/imagery, right: form), multi-step progress indicator

---

**Critical Principles:**
- Mobile-first responsive design throughout
- Consistent dark mode with proper contrast ratios
- High engagement visual feedback (likes, shares animate)
- Performance: Lazy load images, virtualized infinite scroll
- Accessibility: ARIA labels, keyboard navigation, focus states
- Gen Z appeal: Bold, energetic, authentic, community-driven aesthetic