interface ResourceCardProps {
  name: string;
  url: string;
  description: string;
}

export default function ResourceCard({ name, url, description }: ResourceCardProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Visit ${name} (opens in new tab)`}
      className="
        bg-mantle border border-surface0 rounded-lg p-4 flex flex-col h-full
        hover:border-primary hover:shadow-lg hover:-translate-y-1
        transition-all duration-200 ease-out
        transform hover:scale-[1.02] active:scale-[0.98]
      "
      style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
    >
      <h3 className="font-semibold text-primary mb-2 transition-colors duration-200">{name}</h3>
      <p className="text-sm text-subtext0 flex-grow">{description}</p>
      <span className="mt-3 text-sm font-medium text-primary hover:underline transition-all duration-200 group-hover:translate-x-1">
        Visit →
      </span>
    </a>
  );
}
