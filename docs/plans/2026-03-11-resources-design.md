# Resources Page Design

**Date:** 2026-03-11
**Status:** Approved

## Overview

A dedicated `/resources` page providing curated resources for new CS students and developers.

## Audience

- High school students exploring CS
- Current CS students (1st-2nd year)
- Self-taught/aspiring developers

## Page Structure

### Route

- `/resources`

### Navbar Update

- Add "Resources" link between "CSPathFinder" and theme toggle

### Layout

- Max-width container (960px)
- Hero section with title and description
- 4 category sections with grid of cards

## Categories & Resources

### Learn to Code

- DevRoadmaps - Roadmaps for every tech stack
- W3Schools - Basic HTML/CSS/JS tutorials
- freeCodeCamp - Free coding courses with projects
- Exercism - Language-agnostic challenges with mentor feedback
- GitHub Skills - Interactive Git tutorials

### Interview Prep

- LeetCode - Algorithm and data structure problems
- NeetCode - Curated LeetCode problem lists
- Tech Interview Handbook - Comprehensive interview prep guide
- CodeSignal - Practice interviews with real-world scenarios
- Pramp - Free peer-to-peer mock interviews

### Job Search

- Levels.fyi - Salary data by company and location
- Coursera/edX - College-level courses for skill-building

### Tools & Docs

- Can I Use - Browser compatibility tables
- GitHub Docs - Git and GitHub documentation

## Component Design

### Resource Card

- Border card with hover lift effect
- Resource name (bold, blue)
- Description (subtext color)
- "Visit" button (secondary style)
- Responsive: 3 columns desktop, 2 tablet, 1 mobile

### Styling

```tsx
// Card styles
className = "bg-mantle border border-surface0 hover:border-blue transition-all rounded-lg p-4";

// Button styles
className = "px-4 py-2 rounded-lg hover:bg-blue/10 text-blue text-sm font-medium";
```

## Data Structure

```typescript
const resources = {
  learnToCode: Array<{ name: string; url: string; description: string }>,
  interviewPrep: Array<{ name: string; url: string; description: string }>,
  jobSearch: Array<{ name: string; url: string; description: string }>,
  toolsAndDocs: Array<{ name: string; url: string; description: string }>,
};
```

## Tech Stack

- Next.js App Router page
- TypeScript for type safety
- Tailwind CSS for styling
- Existing Catppuccin theme
