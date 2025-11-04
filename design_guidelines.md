# UniNexus Design Guidelines

## Design Approach: Reference-Based with Custom Gen Z Aesthetic

**Primary References:**
- **Social/Feed Patterns:** Instagram (card layouts, reactions), Discord (community channels)
- **Gamification:** Duolingo (achievement animations, streaks), LinkedIn (skill endorsements)
- **Dashboard Analytics:** Linear (clean metrics), Notion (flexible card layouts)
- **Career Features:** LinkedIn (professional profiles), Wellfound (talent matching)

**Custom Differentiation:** Vibrant Gen Z energy with neon gradients and playful professionalism

## Core Design Elements

### A. Typography
**Font Families:**
- Primary: Poppins (headings, emphasis, bold statements)
- Secondary: Inter (body text, UI elements, data)

**Scale & Hierarchy:**
- Hero/Display: text-5xl to text-6xl, font-bold (Poppins)
- Section Headers: text-3xl to text-4xl, font-semibold (Poppins)
- Card Titles: text-xl to text-2xl, font-semibold (Poppins)
- Body Text: text-base to text-lg, font-normal (Inter)
- Captions/Meta: text-sm, font-medium (Inter)
- Micro Text: text-xs (badges, timestamps)

### B. Layout System
**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16
- Compact spacing: p-2, m-2, gap-2 (tight UI elements)
- Standard spacing: p-4, m-4, gap-4 (cards, buttons)
- Section padding: p-8, py-12, py-16 (major sections)
- Large margins: m-12, m-16 (page-level separation)

**Container Strategy:**
- Max widths: max-w-7xl (dashboards), max-w-4xl (feeds), max-w-2xl (forms)
- Grid patterns: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 (responsive cards)
- Flex layouts: flex flex-col md:flex-row gap-4 (adaptive layouts)

### C. Component Library

**Navigation:**
- Top navbar: Fixed position with gradient background, glass morphism effect (backdrop-blur)
- Role switcher: Prominent pill-style selector in navbar
- Sidebar (dashboards): Collapsible on mobile, always visible on desktop with icon + text navigation
- Bottom nav (mobile): Fixed tab bar for primary Student interface actions

**Cards & Containers:**
- Social posts: Rounded-lg with soft shadow, hover lift effect
- Profile cards: Rounded-xl with gradient border accent
- Stats/metrics cards: Grid layout with icon, number, label pattern
- Achievement badges: Circular or shield-shaped with glow effects

**Feed Components:**
- Post card: Avatar, username, timestamp, content, image preview, reaction bar, comment section
- Comment thread: Nested indentation with connecting lines
- Reaction bar: Horizontal pill buttons with counts (like, celebrate, insightful)

**Gamification Elements:**
- Badge showcase: Masonry grid or horizontal scroll of earned badges with tooltips
- Progress bars: Gradient-filled with rounded ends and percentage labels
- Leaderboard rows: Rank number, avatar, name, score, trend indicator
- Achievement unlock: Modal with animated badge reveal and confetti effect

**Forms & Inputs:**
- Text inputs: Rounded borders with focus gradient glow
- Textareas: Auto-expanding for post creation
- File upload: Drag-and-drop zone with preview thumbnails
- Select dropdowns: Custom styled with rounded corners

**Buttons:**
- Primary CTA: Gradient background (purple to pink), rounded-lg, font-semibold
- Secondary: Outlined with gradient border, transparent background
- Ghost: Text only with hover background
- Icon buttons: Circular with subtle background

**Modals & Overlays:**
- Modal backdrop: Dark overlay with blur
- Modal content: Centered, rounded-xl, max-width constraint
- Notification toasts: Top-right positioned, slide-in animation

**AI ChatBot:**
- Fixed bottom-right floating button with gradient and pulse animation
- Expandable chat panel: Rounded top corners, message bubbles (user vs bot styling)
- Typing indicator: Animated dots

**Data Visualization:**
- Line charts: Gradient fill under curves
- Bar charts: Rounded corners on bars with gradient fills
- Donut charts: Center metric display
- Trend indicators: Arrow icons with color coding

### D. Animations
Use sparingly and purposefully:
- **Page transitions:** Fade-in on route changes
- **Card hover:** Subtle lift (translateY(-4px)) with shadow increase
- **Badge unlock:** Scale-up with rotation and glow pulse
- **Notifications:** Slide-in from right with bounce
- **Loading states:** Skeleton screens with shimmer effect
- **Button interactions:** Scale on press (scale-95)
- **Leaderboard updates:** Highlight flash for rank changes

**Animation Timing:**
- Micro-interactions: 150-200ms
- Standard transitions: 300ms
- Complex reveals: 500ms
- Use ease-in-out for natural feel

## Role-Specific UI Considerations

**Student Interface:**
- Emphasis on social feed as landing page
- Floating action button for quick post creation
- Prominent badge display in profile header
- Gamification elements front and center

**Teacher Dashboard:**
- Clean, professional layout with data tables
- Student grid view with quick endorsement actions
- Analytics charts for class engagement
- Endorsement workflow modals

**University Admin:**
- Executive dashboard with key metrics in hero section
- Institutional branding integration area
- Announcement creation with rich text editor
- Multi-chart analytics views

**Industry Partner:**
- Talent discovery with filterable student cards
- Challenge creation wizard interface
- Company profile showcase section
- Project review interface with rating system

**Master Admin:**
- Dense information layout with tabbed navigation
- User management table with bulk actions
- System health monitoring dashboard
- Content moderation queue with action buttons

## Images

**Student Profile Hero:** Abstract geometric patterns with neon gradient overlays (decorative, not photographic)

**Landing Page Hero:** Vibrant illustration of diverse students collaborating with floating UI elements (cards, badges, chat bubbles) in purple-blue-pink gradient environment

**Industry Partner Profiles:** Company logo placeholders with gradient backgrounds

**Achievement Badges:** Custom SVG icons with glow effects (trophy, star, shield, lightning bolt designs)

**Empty States:** Playful illustrations with encouraging messaging (e.g., "No posts yet - be the first to share!")

**Course Thumbnails:** Abstract subject-themed icons on gradient backgrounds (no photography needed)

All images should support the vibrant, energetic Gen Z aesthetic without being photorealistic - lean into illustrations, abstract shapes, and gradient treatments.