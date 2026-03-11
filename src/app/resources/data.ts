export interface Resource {
  name: string;
  url: string;
  description: string;
}

export interface ResourceCategory {
  title: string;
  resources: Resource[];
}

export const resourceCategories: ResourceCategory[] = [
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
];
