import { ResourceCategorySchema } from "@/lib/data/schema";

export const resourceCategories = [
  {
    title: "Learn to Code",
    resources: [
      {
        name: "DevRoadmaps",
        url: "https://roadmap.sh",
        description: "Roadmaps for every tech stack",
      },
      {
        name: "W3Schools",
        url: "https://www.w3schools.com",
        description: "Basic HTML/CSS/JS tutorials",
      },
      {
        name: "freeCodeCamp",
        url: "https://www.freecodecamp.org",
        description: "Free coding courses with projects",
      },
      {
        name: "Exercism",
        url: "https://exercism.org",
        description: "Language-agnostic challenges with mentor feedback",
      },
      {
        name: "GitHub Skills",
        url: "https://skills.github.com",
        description: "Interactive Git tutorials",
      },
    ],
  },
  {
    title: "Interview Prep",
    resources: [
      {
        name: "LeetCode",
        url: "https://leetcode.com",
        description: "Algorithm and data structure problems",
      },
      {
        name: "NeetCode",
        url: "https://neetcode.io",
        description: "Curated LeetCode problem lists",
      },
      {
        name: "Tech Interview Handbook",
        url: "https://www.techinterviewhandbook.org",
        description: "Comprehensive interview prep guide",
      },
      {
        name: "CodeSignal",
        url: "https://codesignal.com",
        description: "Practice interviews with real-world scenarios",
      },
      {
        name: "Pramp",
        url: "https://www.pramp.com",
        description: "Free peer-to-peer mock interviews",
      },
    ],
  },
  {
    title: "Job Search",
    resources: [
      {
        name: "Levels.fyi",
        url: "https://www.levels.fyi",
        description: "Salary data by company and location",
      },
      {
        name: "Coursera",
        url: "https://www.coursera.org",
        description: "College-level courses for skill-building",
      },
      {
        name: "edX",
        url: "https://www.edx.org",
        description: "College-level courses from top universities",
      },
    ],
  },
  {
    title: "Tools & Docs",
    resources: [
      {
        name: "Can I Use",
        url: "https://caniuse.com",
        description: "Browser compatibility tables",
      },
      {
        name: "GitHub Docs",
        url: "https://docs.github.com",
        description: "Git and GitHub documentation",
      },
    ],
  },
  {
    title: "AI Tools",
    resources: [
      {
        name: "Claude",
        url: "https://claude.ai",
        description: "Anthropic's AI assistant for coding and reasoning",
      },
      {
        name: "ChatGPT",
        url: "https://chat.openai.com",
        description: "OpenAI's conversational AI for various tasks",
      },
      {
        name: "Gemini",
        url: "https://gemini.google.com",
        description: "Google's AI assistant for creative and technical tasks",
      },
      {
        name: "GLM",
        url: "https://open.bigmodel.cn",
        description: "Zhipu AI's large language model",
      },
      {
        name: "Grok",
        url: "https://grok.x.ai",
        description: "xAI's AI assistant with real-time knowledge",
      },
      {
        name: "Perplexity",
        url: "https://perplexity.ai",
        description: "AI-powered search engine with citations",
      },
      {
        name: "Lovable",
        url: "https://lovable.dev",
        description: "AI-powered full-stack development tool",
      },
      {
        name: "Bolt",
        url: "https://bolt.new",
        description: "AI web app builder for rapid prototyping",
      },
    ],
  },
];

ResourceCategorySchema.array().parse(resourceCategories);
