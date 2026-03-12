import ResourceCard from "./ResourceCard";
import { resourceCategories } from "./data";
import PageTransition from "@/components/PageTransition";

export default function ResourcesPage() {
  return (
    <PageTransition>
      <main className="max-w-[960px] mx-auto px-4 py-8">
        <section className="mb-12">
          <h1 className="text-3xl font-bold mb-4">Resources for New Developers</h1>
          <p className="text-lg text-subtext0 max-w-2xl">
            Curated tools, tutorials, and guides to help you learn to code, ace interviews, and
            launch your career in computer science.
          </p>
        </section>

        {resourceCategories.map((category) => (
          <section key={category.title} className="mb-12">
            <h2 className="text-2xl font-bold mb-6">{category.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.resources.map((resource) => (
                <ResourceCard
                  key={resource.name}
                  name={resource.name}
                  url={resource.url}
                  description={resource.description}
                />
              ))}
            </div>
          </section>
        ))}
      </main>
    </PageTransition>
  );
}
