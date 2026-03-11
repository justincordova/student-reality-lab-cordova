import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  return (
    <nav className="mx-auto max-w-[960px] mt-4 rounded-lg border border-surface0 bg-mantle px-8 shadow-sm">
      <div className="h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue">
          CSPathFinder
        </Link>
        <ThemeToggle />
      </div>
    </nav>
  );
}
