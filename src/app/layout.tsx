import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { cn } from "@/utils/cn";
import Navbar from "@/components/Navbar";
import ChatProvider from "@/components/ChatProvider";
import ChatButton from "@/components/ChatButton";
import ChatDrawer from "@/components/ChatDrawer";
import ErrorBoundary from "@/components/ErrorBoundary";
import SkipLink from "@/components/SkipLink";
import LayoutContent from "@/components/LayoutContent";
import CompareBar from "@/components/CompareBar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

const themeScript = `
(function() {
  var t;
  try { t = localStorage.getItem('theme'); } catch(e) {}
  if (!t) t = 'mocha';
  if (t === 'mocha') document.documentElement.setAttribute('data-theme', 'mocha');
})();
`;

export const metadata: Metadata = {
  title: {
    default: "CSPathFinder",
    template: "%s | CSPathFinder",
  },
  description: "Find and compare top Computer Science programs across US colleges.",
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
      <body
        className={cn(
          inter.variable,
          geistMono.variable,
          "bg-base text-text font-sans antialiased"
        )}
      >
        <SkipLink />
        <ErrorBoundary>
          <ChatProvider>
            <LayoutContent>
              <Navbar />
              <main className="max-w-[960px] mx-auto px-8">{children}</main>
            </LayoutContent>
            <ChatButton />
            <ChatDrawer />
            <CompareBar />
          </ChatProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
