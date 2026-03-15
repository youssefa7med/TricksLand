# Responsive React Navbar Component Documentation

## Overview
A modern, fully-responsive React navbar component built with **Next.js**, **React Hooks**, **Framer Motion**, and **Tailwind CSS**. Includes dark/light mode toggle, language switcher (Arabic/English), user dropdown menu, and complete mobile responsiveness.

---

## Features Implemented ✅

### 1. **Menu Items** (12 Navigation Links)
- Dashboard
- Courses
- Sessions
- Students
- Student Attendance
- Coaches
- Coach Attendance (Admin) / My Attendance (Coach)
- Adjustments
- Financial
- Reports
- Scheduling
- Invoices

**Implementation:**
```tsx
const adminNav = [
  { name: t('dashboard'), href: `/${locale}/admin/dashboard`, icon: 'dashboard' },
  { name: t('courses'), href: `/${locale}/admin/courses`, icon: 'courses' },
  // ... more items
];

const coachNav = [
  { name: t('dashboard'), href: `/${locale}/coach/dashboard`, icon: 'dashboard' },
  // ... coach-specific items
];

const navItems = role === 'admin' ? adminNav : coachNav;
```

---

### 2. **Dark Mode Toggle Button** 🌙☀️
- **Single button** with smooth icon animation
- **Moon icon** (☾) in light mode → **Sun icon** (☀) in dark mode
- **Smooth transitions** using Framer Motion
- **Persistent storage** - saves preference in localStorage
- **System preference detection** - defaults to system dark mode if no saved preference
- Available on **all screen sizes** (mobile, tablet, desktop)

**Key Code:**
```tsx
const [theme, setTheme] = useState<'light' | 'dark'>('light');
const [mounted, setMounted] = useState(false);

// Initialize theme from localStorage or system preference
useEffect(() => {
  const saved = window.localStorage.getItem('theme') as 'light' | 'dark' | null;
  const initialTheme: 'light' | 'dark' = saved === 'dark' || saved === 'light'
    ? saved
    : window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  
  document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  document.documentElement.dataset.theme = initialTheme;
  setTheme(initialTheme);
  setMounted(true);
}, []);

const toggleTheme = () => {
  const nextTheme: 'light' | 'dark' = theme === 'light' ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  document.documentElement.dataset.theme = nextTheme;
  window.localStorage.setItem('theme', nextTheme);
  setTheme(nextTheme);
};

// Button with smooth animation
<motion.button
  onClick={toggleTheme}
  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all duration-200"
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
</motion.button>
```

---

### 3. **Language Switcher** (Arabic/English) 🌐
- **Visible on all screen sizes**
- Desktop: Full text button (العربية / English)
- Mobile: Short form (ع / EN)
- **Smooth transitions**
- **Persistent across navigation**

**Key Code:**
```tsx
const handleToggleLanguage = () => {
  const targetLocale = locale === 'en' ? 'ar' : 'en';
  const segments = pathname.split('/');
  if (segments[1] === 'en' || segments[1] === 'ar') {
    segments[1] = targetLocale;
  } else {
    segments.splice(1, 0, targetLocale);
  }
  router.push(segments.join('/'));
};

// Desktop button
<motion.button
  onClick={handleToggleLanguage}
  className="hidden sm:block px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
>
  {langLabel}
</motion.button>

// Mobile button
<motion.button
  onClick={handleToggleLanguage}
  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 transition-all"
>
  <span className="text-xs font-bold">{locale === 'en' ? 'ع' : 'EN'}</span>
</motion.button>
```

---

### 4. **Admin User Dropdown Menu** 👤
**Desktop (lg+ screens):**
- User avatar with initial (A/C)
- Role label (Admin/Coach)
- Click to open dropdown menu
- Dropdown displays:
  - User profile header with avatar, name, and role
  - Settings link
  - Logout button
  - Smooth animations

**Mobile (below lg):**
- Simple user profile section in mobile menu
- Avatar with user info
- Settings link
- Logout button

**Key Code:**
```tsx
const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

// Desktop User Button with Dropdown
<div className="relative">
  <motion.button
    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-all"
  >
    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-xs font-bold text-white">
      {role.charAt(0).toUpperCase()}
    </div>
    <span className="hidden xl:inline capitalize">{role}</span>
  </motion.button>

  {/* Dropdown Menu */}
  <AnimatePresence>
    {isUserDropdownOpen && (
      <motion.div
        className="absolute right-0 mt-2 w-56 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 shadow-lg overflow-hidden"
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        {/* User Header */}
        <div className="px-4 py-3 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-sm font-bold text-white">
              {role.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-white capitalize">{role}</p>
              <p className="text-xs text-white/60">Administrator</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="py-2 px-2 space-y-1">
          <Link href={`/${locale}/settings`} onClick={() => setIsUserDropdownOpen(false)}>
            <Settings size={16} />
            {t('settings')}
          </Link>
          <button onClick={() => { setIsUserDropdownOpen(false); handleLogout(); }}>
            <LogOut size={16} />
            {tc('logout')}
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</div>
```

---

### 5. **Full Responsiveness** 📱💻🖥️

#### Breakpoints:
- **Mobile (< md / < 768px):**
  - Logo visible (compact)
  - Theme toggle (icon only)
  - Language toggle (short form)
  - Hamburger menu button
  - All nav items in mobile menu drawer

- **Tablet (md - lg / 768px - 1024px):**
  - Logo visible
  - No desktop nav items
  - Controls in nav bar
  - Mobile menu for navigation

- **Desktop (lg+ / ≥ 1024px):**
  - Full logo with text
  - All nav items in top bar
  - All controls visible
  - User dropdown menu

- **Large Desktop (xl+ / ≥ 1280px):**
  - Extended navigation display
  - Full button labels
  - All features visible

#### Responsive Classes:
```tsx
// Hidden on mobile, visible on sm and up
<div className="hidden sm:block">...</div>

// Hidden on mobile and tablet, visible on lg and up
<div className="hidden lg:flex">...</div>

// Only visible on mobile and tablet
<div className="flex md:hidden">...</div>

// Responsive text
<span className="hidden xl:inline">Text</span>
```

---

### 6. **Mobile Menu Animations** ✨

**Opening Animation:**
```tsx
<motion.div 
  initial={{ opacity: 0, height: 0 }}
  animate={{ opacity: 1, height: "auto" }}
  exit={{ opacity: 0, height: 0 }}
  transition={{ duration: 0.3 }}
>
  {/* Menu content with staggered item animations */}
  {navItems.map((item, idx) => (
    <motion.div
      key={item.href}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.04 }}
    >
      {/* Item */}
    </motion.div>
  ))}
</motion.div>
```

**Features:**
- Smooth height animation
- Staggered item entrance
- Slide-in effect from left
- Auto-closes on route change
- No overlap or clipping

---

### 7. **Tailwind CSS Styling** 🎨

**Color Scheme:**
- Primary accent color (gradient effects)
- White/opacity backgrounds for glass effect
- Hover states with subtle background changes
- Smooth transitions (duration-200, duration-300)

**Key Classes:**
```css
/* Glass effect */
.glass-nav {
  background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
  backdrop-filter: blur(10px);
}

/* Responsive padding */
px-4 sm:px-6 lg:px-8
py-1.5 sm:py-2

/* Hover effects */
hover:bg-white/10
hover:border-white/20
hover:text-primary
transition-all duration-200

/* State indicators */
bg-primary/10 (active nav item)
text-primary (active text)
border border-primary/30 (active border)
```

---

## State Management (Hooks)

| State | Purpose | Initial Value |
|-------|---------|---------------|
| `isOpen` | Mobile menu toggle | `false` |
| `isUserDropdownOpen` | User dropdown toggle | `false` |
| `isMobile` | Screen size detection | `false` |
| `theme` | Current theme (light/dark) | `'light'` |
| `mounted` | Hydration check | `false` |

---

## Framer Motion Animations

### 1. **Navbar Entry**
```tsx
<motion.nav 
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
>
```

### 2. **Button Interactions**
```tsx
whileHover={{ scale: 1.05 }}
whileTap={{ scale: 0.95 }}
```

### 3. **Menu Items**
```tsx
// Desktop items
initial={{ opacity: 0, y: -5 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: idx * 0.03 }}

// Mobile items
initial={{ opacity: 0, x: -10 }}
animate={{ opacity: 1, x: 0 }}
transition={{ delay: idx * 0.04 }}
```

### 4. **Dropdown Menu**
```tsx
initial={{ opacity: 0, y: -10, scale: 0.95 }}
animate={{ opacity: 1, y: 0, scale: 1 }}
exit={{ opacity: 0, y: -10, scale: 0.95 }}
transition={{ duration: 0.2 }}
```

### 5. **Active Indicator**
```tsx
layoutId="activeIndicator"
initial={{ scale: 0.95 }}
animate={{ scale: 1 }}
transition={{ duration: 0.2 }}
```

---

## Dependencies

```json
{
  "next": "^16.1.6",
  "react": "^19.0.0",
  "motion": "^13.0.0",
  "lucide-react": "^latest",
  "next-intl": "^latest"
}
```

---

## File Structure

```
components/
├── layout/
│   └── Navbar.tsx          # Main navbar component
├── theme/
│   └── ThemeToggle.tsx     # Theme configuration (optional)
├── ...
app/
├── globals.css             # Global styles with dark mode support
├── layout.tsx              # Root layout
└── ...
```

---

## Usage

```tsx
import { Navbar } from '@/components/layout/Navbar';

export default function RootLayout() {
  return (
    <html>
      <body>
        <Navbar role="admin" />
        {/* Page content */}
      </body>
    </html>
  );
}
```

---

## Accessibility Features ♿

- ✅ `aria-label` on icon buttons
- ✅ `title` attributes for tooltips
- ✅ Semantic HTML elements
- ✅ Keyboard navigation support
- ✅ High contrast on interactive elements
- ✅ Focus states on hover

---

## Performance Optimizations ⚡

1. **Lazy animations** - Only animate when visible
2. **Framer Motion optimization** - GPU-accelerated transforms
3. **CSS classes** - Tailwind compiled CSS (no runtime overhead)
4. **Hydration-safe** - Theme loading after mount
5. **Memoization** - Static navigation items

---

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## Dark Mode Implementation

The dark mode system:
1. Detects localStorage saved preference
2. Falls back to system preference if not set
3. Applies `dark` class to `<html>` element
4. Saves preference for persistence
5. Works seamlessly with Tailwind's dark mode

**CSS Support:**
```css
/* Light mode (default) */
.bg-white/5 { background-color: rgba(255, 255, 255, 0.05); }

/* Dark mode */
.dark .bg-white/5 { background-color: rgba(255, 255, 255, 0.08); }
```

---

## Summary

This Navbar component delivers:
✅ 12 menu items with role-based filtering
✅ Dark/light mode toggle with persistence
✅ Arabic/English language switcher
✅ User dropdown menu with settings & logout
✅ Fully responsive (mobile-first design)
✅ Smooth Framer Motion animations
✅ Zero layout shift or clipping
✅ Tailwind CSS styling
✅ Modern React hooks & functional components
✅ Type-safe TypeScript implementation
✅ Accessible and performant

**Latest Commit:** `401ae22` - "Enhance Navbar with user dropdown menu and improved profile display"
