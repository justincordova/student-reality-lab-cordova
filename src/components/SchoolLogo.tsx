"use client";

import { useState } from "react";
import Image from "next/image";

interface SchoolLogoProps {
  website: string;
  name: string;
  size?: number;
}

function getDomain(url: string): string {
  if (!url || typeof url !== "string") return "";
  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.protocol.startsWith("http")) return "";
    const hostname = parsedUrl.hostname.toLowerCase();

    if (
      hostname === "localhost" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.") ||
      hostname.startsWith("127.") ||
      hostname === "::1"
    ) {
      return "";
    }

    const publicSuffixes = [
      ".com",
      ".org",
      ".net",
      ".edu",
      ".gov",
      ".mil",
      ".io",
      ".co",
      ".us",
      ".uk",
      ".ca",
      ".au",
      ".de",
      ".fr",
      ".jp",
      ".cn",
      ".in",
      ".br",
      ".ru",
      ".es",
      ".it",
      ".mx",
      ".za",
      ".nl",
      ".se",
      ".ch",
      ".no",
      ".dk",
      ".fi",
      ".pl",
      ".be",
      ".at",
      ".cz",
      ".gr",
      ".pt",
      ".hu",
      ".ie",
      ".nz",
      ".sg",
      ".hk",
      ".tw",
      ".kr",
      ".th",
      ".vn",
      ".id",
      ".my",
      ".ph",
      ".ar",
      ".cl",
      ".co",
      ".pe",
      ".ve",
      ".uy",
      ".py",
      ".ec",
      ".bo",
    ];
    const hasPublicSuffix = publicSuffixes.some((suffix) => hostname.endsWith(suffix));

    if (!hasPublicSuffix && hostname.split(".").length < 2) {
      return "";
    }

    return hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function getInitials(name: string): string {
  if (!name || typeof name !== "string") return "?";
  return name
    .split(/\s+/)
    .filter((w) => w && w.length > 0)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function SchoolLogo({ website, name, size = 40 }: SchoolLogoProps) {
  const [failed, setFailed] = useState(false);
  const domain = getDomain(website);
  const safeSize = Math.max(16, Math.min(size, 200));

  if (failed || !domain) {
    return (
      <div
        className="rounded-lg bg-surface0 flex items-center justify-center text-subtext0 font-bold shrink-0"
        style={{ width: safeSize, height: safeSize, fontSize: safeSize * 0.35 }}
      >
        {getInitials(name)}
      </div>
    );
  }

  const token = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN;
  const src = token
    ? `https://img.logo.dev/${domain}?token=${token}`
    : `https://img.logo.dev/${domain}`;

  return (
    <Image
      src={src}
      alt={`${name} logo`}
      width={safeSize}
      height={safeSize}
      className="rounded-lg shrink-0 bg-white"
      onError={() => setFailed(true)}
      loading="lazy"
      unoptimized={domain.includes("localhost") || !domain.includes(".")}
    />
  );
}
