# Phase 1: Setup (Tasks 0, 0.75, 1, 1.5, 2)

> See [00-overview.md](./00-overview.md) for architecture, tech stack, and shared context.

## Task 0: Setup and Dependencies

**Files:**

- Modify: `package.json`
- Modify: `CLAUDE.md`

**Step 1: Update package name**

Update `"name"` field in `package.json`:

```json
"name": "cspathfinder"
```

**Step 2: Add required dependencies**

Add these to `dependencies` in `package.json`:

```json
{
  "recharts": "^2.13.3",
  "openai": "^4.73.0"
}
```

The `openai` package is used as a client for Hugging Face's OpenAI-compatible API endpoint.

**Step 3: Install dependencies**

Run: `bun install`
Expected: All dependencies installed successfully

**Step 4: Update CLAUDE.md**

Update the project name and description references from "CS ROI Calculator" to "CSPathFinder". Update the description to reflect the new goal. Keep all other conventions the same.

**Step 5: Commit**

```bash
git add package.json bun.lockb CLAUDE.md
git commit -m "feat: rename project to CSPathFinder and add dependencies"
```

---

## Task 0.75: Environment Variable Validation

**Files:**

- Modify: `src/lib/env.ts` (already exists — add `HF_TOKEN`)
- Modify: `next.config.ts`

> `src/lib/env.ts` already exists with `NODE_ENV`, `LOG_LEVEL`, `LOG_DIR`, and `NEXT_PUBLIC_APP_URL`. Do NOT replace it — add `HF_TOKEN` to the existing schema.

**Step 1: Add HF_TOKEN to the existing env schema**

Update `src/lib/env.ts` to add `HF_TOKEN`:

```typescript
import { z } from "zod/v4";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "http", "debug"]).optional(),
  LOG_DIR: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.url().optional(),
  HF_TOKEN: z.string().min(1).optional(),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    process.stderr.write("Invalid environment variables:\n");
    process.stderr.write(z.prettifyError(result.error) + "\n");
    process.exit(1);
  }

  return result.data;
}

export const env = parseEnv();
```

**Step 2: Update next.config.ts**

Update `next.config.ts` to validate env at build time and configure Clearbit image domain. Note: `@/` aliases don't work in `next.config.ts`, so use a relative import:

```typescript
import "./src/lib/env"; // Side-effect: validates env vars at build time

const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "logo.clearbit.com" }],
  },
  env: {
    HF_TOKEN: process.env.HF_TOKEN,
  },
};

export default nextConfig;
```

**Step 3: Commit**

```bash
git add src/lib/env.ts next.config.ts
git commit -m "feat: add HF_TOKEN to env schema and configure next.config"
```

---

## Task 1: Setup Catppuccin Theme and Design Tokens

**Files:**

- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `src/components/ThemeToggle.tsx`

**Step 1: Define Catppuccin Latte (light) and Mocha (dark) CSS custom properties**

Update `src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-mono:
    var(--font-geist-mono), ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, monospace;

  /* Register Catppuccin token names — actual values come from :root / [data-theme] */
  --color-base: var(--ctp-base);
  --color-mantle: var(--ctp-mantle);
  --color-crust: var(--ctp-crust);
  --color-surface0: var(--ctp-surface0);
  --color-surface1: var(--ctp-surface1);
  --color-surface2: var(--ctp-surface2);
  --color-overlay0: var(--ctp-overlay0);
  --color-overlay1: var(--ctp-overlay1);
  --color-overlay2: var(--ctp-overlay2);
  --color-subtext0: var(--ctp-subtext0);
  --color-subtext1: var(--ctp-subtext1);
  --color-text: var(--ctp-text);
  --color-blue: var(--ctp-blue);
  --color-lavender: var(--ctp-lavender);
  --color-sapphire: var(--ctp-sapphire);
  --color-sky: var(--ctp-sky);
  --color-teal: var(--ctp-teal);
  --color-green: var(--ctp-green);
  --color-yellow: var(--ctp-yellow);
  --color-peach: var(--ctp-peach);
  --color-maroon: var(--ctp-maroon);
  --color-red: var(--ctp-red);
  --color-mauve: var(--ctp-mauve);
  --color-pink: var(--ctp-pink);
  --color-flamingo: var(--ctp-flamingo);
  --color-rosewater: var(--ctp-rosewater);
  --color-on-primary: var(--ctp-on-primary);
}

/* Catppuccin Latte (light) - default */
:root {
  --ctp-base: #eff1f5;
  --ctp-mantle: #e6e9ef;
  --ctp-crust: #dce0e8;
  --ctp-surface0: #ccd0da;
  --ctp-surface1: #bcc0cc;
  --ctp-surface2: #acb0be;
  --ctp-overlay0: #9ca0b0;
  --ctp-overlay1: #8c8fa1;
  --ctp-overlay2: #7c7f93;
  --ctp-subtext0: #6c6f85;
  --ctp-subtext1: #5c5f77;
  --ctp-text: #4c4f69;
  --ctp-blue: #1e66f5;
  --ctp-lavender: #7287fd;
  --ctp-sapphire: #209fb5;
  --ctp-sky: #04a5e5;
  --ctp-teal: #179299;
  --ctp-green: #40a02b;
  --ctp-yellow: #df8e1d;
  --ctp-peach: #fe640b;
  --ctp-maroon: #e64553;
  --ctp-red: #d20f39;
  --ctp-mauve: #8839ef;
  --ctp-pink: #ea76cb;
  --ctp-flamingo: #dd7878;
  --ctp-rosewater: #dc8a78;
  --ctp-on-primary: #ffffff;
}

/* Catppuccin Mocha (dark) */
[data-theme="mocha"] {
  --ctp-base: #1e1e2e;
  --ctp-mantle: #181825;
  --ctp-crust: #11111b;
  --ctp-surface0: #313244;
  --ctp-surface1: #45475a;
  --ctp-surface2: #585b70;
  --ctp-overlay0: #6c7086;
  --ctp-overlay1: #7f849c;
  --ctp-overlay2: #9399b2;
  --ctp-subtext0: #a6adc8;
  --ctp-subtext1: #bac2de;
  --ctp-text: #cdd6f4;
  --ctp-blue: #89b4fa;
  --ctp-lavender: #b4befe;
  --ctp-sapphire: #74c7ec;
  --ctp-sky: #89dceb;
  --ctp-teal: #94e2d5;
  --ctp-green: #a6e3a1;
  --ctp-yellow: #f9e2af;
  --ctp-peach: #fab387;
  --ctp-maroon: #eba0ac;
  --ctp-red: #f38ba8;
  --ctp-mauve: #cba6f7;
  --ctp-pink: #f5c2e7;
  --ctp-flamingo: #f2cdcd;
  --ctp-rosewater: #f5e0dc;
  --ctp-on-primary: #1e1e2e;
}
```

**Step 2: Create theme toggle component**

Create `src/components/ThemeToggle.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'latte' | 'mocha'>('latte');

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'mocha' ? 'mocha' : 'latte');
  }, []);

  const toggle = () => {
    const next = theme === 'latte' ? 'mocha' : 'latte';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next === 'mocha' ? 'mocha' : '');
    try { localStorage.setItem('theme', next); } catch {}
  };

  return (
    <button
      onClick={toggle}
      className="px-3 py-1.5 rounded-lg bg-surface0 text-text hover:bg-surface1 transition-colors text-sm font-medium flex items-center gap-1.5"
      aria-label={`Switch to ${theme === 'latte' ? 'dark' : 'light'} theme`}
    >
      {theme === 'latte' ? (
        <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> Dark</>
      ) : (
        <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> Light</>
      )}
    </button>
  );
}
```

**Step 3: Update layout with Inter font, theme support, and site-wide nav**

Update `src/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { cn } from "@/utils/cn";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

const themeScript = `
(function() {
  try { var t = localStorage.getItem('theme'); } catch(e) {}
  if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'mocha' : 'latte';
  if (t === 'mocha') document.documentElement.setAttribute('data-theme', 'mocha');
})();
`;

export const metadata: Metadata = {
  title: {
    default: "CSPathFinder",
    template: "%s | CSPathFinder",
  },
  description: "Find and compare the top 100 Computer Science programs across US colleges.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={cn(inter.variable, geistMono.variable, "bg-base text-text font-sans antialiased")}>
        {children}
      </body>
    </html>
  );
}
```

**Step 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/components/ThemeToggle.tsx
git commit -m "feat: add Catppuccin Mocha/Latte theme with toggle"
```

---

## Task 1.5: Create Error Boundary Component

**Files:**

- Create: `src/components/ErrorBoundary.tsx`
- Create: `src/tests/components/ErrorBoundary.test.ts`

**Step 1: Create Error Boundary component**

Create `src/components/ErrorBoundary.tsx`:

```typescript
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[200px] items-center justify-center bg-mantle rounded-lg border border-red p-6 text-center">
          <div>
            <h3 className="text-lg font-bold text-red mb-2">Something went wrong</h3>
            <p className="text-sm text-subtext0 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue text-on-primary rounded-lg hover:opacity-90 transition-opacity text-sm"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Step 2: Write test**

Create `src/tests/components/ErrorBoundary.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '@/components/ErrorBoundary';

const ThrowError = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  // Suppress console.error for this test
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should render error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });
});
```

**Step 3: Run test**

Run: `bun run test src/tests/components/ErrorBoundary.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/ErrorBoundary.tsx src/tests/components/ErrorBoundary.test.ts
git commit -m "feat: add ErrorBoundary component with test"
```

---

## Task 2: Create Navbar Component

**Files:**

- Create: `src/components/Navbar.tsx`
- Modify: `src/app/layout.tsx` (add Navbar to body)

**Step 1: Create Navbar**

Create `src/components/Navbar.tsx`:

```typescript
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  return (
    <nav className="border-b border-surface0 bg-mantle">
      <div className="max-w-[960px] mx-auto px-8 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue">
          CSPathFinder
        </Link>
        <ThemeToggle />
      </div>
    </nav>
  );
}
```

**Step 2: Add Navbar to layout.tsx**

Wrap `{children}` in layout.tsx body with Navbar above it:

```typescript
<body className={cn(inter.variable, geistMono.variable, "bg-base text-text font-sans antialiased")}>
  <Navbar />
  <main className="max-w-[960px] mx-auto px-8">
    {children}
  </main>
</body>
```

Import Navbar at the top of layout.tsx.

**Step 3: Commit**

```bash
git add src/components/Navbar.tsx src/app/layout.tsx
git commit -m "feat: add site-wide navbar"
```

---
