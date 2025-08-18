# Universal Assistant UI/UX Redesign Plan

## Current State Analysis
The current dashboard is cluttered with:
- Multiple statistics cards (4 cards)
- Recent meetings section with 3+ meeting cards
- Quick Actions with 3 buttons (Start, Schedule, View Analytics)
- Today's Schedule section
- Complex navigation sidebar
- Various status indicators and trending information

## Design Philosophy: Minimal & Focused
**Goal**: Create a clean, distraction-free interface that focuses on the core meeting functionality.

## New UI Architecture

### 1. Simplified Layout Structure
```
┌─────────────────────────────────────┐
│          HEADER (Minimal)           │
├─────────────────────────────────────┤
│                                     │
│      CENTRAL MEETING CONTROL        │
│         [Start Meeting]             │
│     or  [Stop Meeting]              │
│                                     │
│      [Trigger AI Speech] 🎤         │
│                                     │
├─────────────────────────────────────┤
│                                     │
│       LIVE TRANSCRIPT AREA          │
│     (Auto-scrolling, real-time)     │
│                                     │
├─────────────────────────────────────┤
│       PAST MEETINGS (Collapsed)      │
│            ▶ Past Meetings          │
└─────────────────────────────────────┘
```

### 2. Component Breakdown

#### A. Header (Minimal)
- App name only
- No user menu, no notifications
- Optional: Dark mode toggle (single icon)

#### B. Central Control Area
- **Primary Button**: Toggle between Start/Stop Meeting
  - Start: Green, prominent, centered
  - Stop: Red, same position (replaces Start)
- **Secondary Button**: Trigger AI Speech
  - Only visible during active meeting
  - Blue accent color
  - Shows mic icon with pulse animation when listening

#### C. Live Transcript
- Clean, readable typography
- Speaker identification (if available)
- Auto-scroll to latest
- Minimal styling (no borders, cards, etc.)
- Timestamps every 30 seconds

### 3. Removed Elements
- ❌ All statistics cards
- ❌ Recent meetings section  
- ❌ Schedule meeting button
- ❌ View analytics button
- ❌ Today's schedule
- ❌ Sidebar navigation
- ❌ User profile menu
- ❌ Notification badges
- ❌ Trending indicators

### 4. Technical Implementation Steps

#### Phase 1: Create New Minimal Page
1. Create `/app/(routes)/meeting/page.tsx` - new minimal meeting page
2. Implement basic layout structure
3. Add Start/Stop meeting toggle logic

#### Phase 2: Meeting Controls
1. Implement Start Meeting button with proper state management
2. Add Stop Meeting button that replaces Start when active
3. Add Trigger AI Speech button (visible only during meeting)

#### Phase 3: Live Transcript
1. Create `LiveTranscript` component
2. Connect to existing transcript store
3. Implement auto-scroll and real-time updates
4. Add minimal speaker identification

#### Phase 4: Clean Up
1. Remove unnecessary imports and dependencies
2. Simplify styles to essential only
3. Test all interactions with Playwright

### 5. Color Palette & Styling
```css
Primary Actions:
- Start Meeting: #10b981 (green-500)
- Stop Meeting: #ef4444 (red-500)
- Trigger AI: #3b82f6 (blue-500)

Background:
- Light mode: #ffffff
- Dark mode: #111827

Text:
- Primary: #111827 / #f9fafb
- Secondary: #6b7280 / #9ca3af
- Transcript: #374151 / #e5e7eb
```

### 6. Past Meetings Section
**Location**: Below the live transcript area, collapsible

#### Design:
- Minimalist accordion/collapsible section
- Title: "Past Meetings" with chevron icon
- When expanded, shows simple list:
  - Meeting date/time
  - Duration
  - Click to view transcript
- Data fetched from Firebase Firestore
- Maximum 10 most recent meetings shown
- "Load more" button if needed

#### Firebase Integration:
```typescript
// Fetch from Firestore
meetings collection: /users/{userId}/meetings
- Sorted by: createdAt DESC
- Limit: 10
- Fields: id, title, createdAt, duration, transcriptId
```

### 7. Interaction Flow
1. User lands on page → sees only "Start Meeting" button
2. Clicks "Start Meeting" → button changes to "Stop Meeting"
3. "Trigger AI Speech" button appears below
4. Live transcript starts appearing as speech is detected
5. User can trigger AI responses on demand
6. Clicking "Stop Meeting" → returns to initial state
7. Past meetings section available at bottom (collapsed by default)

### 8. Responsive Design
- Mobile: Stack buttons vertically, full width
- Tablet: Center buttons with 60% width
- Desktop: Center buttons with 40% width

### 9. Accessibility
- Large, clickable buttons (min 44x44px)
- High contrast ratios (WCAG AAA)
- Clear focus states
- Screen reader labels
- Keyboard navigation support

## Implementation Priority
1. **Critical**: Start/Stop meeting functionality
2. **Critical**: Live transcript display
3. **High**: Trigger AI Speech button
4. **Medium**: Polish animations and transitions
5. **Low**: Additional accessibility enhancements

## Success Metrics
- Time to start meeting: < 2 seconds
- UI complexity score: Reduce by 80%
- Button visibility: 100% above fold
- Transcript latency: < 500ms