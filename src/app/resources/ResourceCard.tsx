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
      className="bg-mantle border border-surface0 hover:border-blue transition-all rounded-lg p-4 flex flex-col h-full"
    >
      <h3 className="font-semibold text-blue mb-2">{name}</h3>
      <p className="text-sm text-subtext0 flex-grow">{description}</p>
      <span className="mt-3 text-sm font-medium text-blue hover:underline">Visit →</span>
    </a>
  );
}
