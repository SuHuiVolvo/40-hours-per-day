export type AppPage = "roadmap" | "daily" | "notes";

type TopNavigationProps = {
  activePage: AppPage;
};

const pages: Array<{ id: AppPage; label: string }> = [
  { id: "daily", label: "Daily task" },
  { id: "roadmap", label: "Road map" },
  { id: "notes", label: "Note library" },
];

export function TopNavigation({ activePage }: TopNavigationProps) {
  return (
    <nav className="top-nav" aria-label="Primary navigation">
      <div className="top-nav-brand">
        <span className="top-nav-brand-eyebrow">Hoppy Practice Studio</span>
        <strong>Practice routes</strong>
      </div>

      <div className="top-nav-links">
        {pages.map((page) => (
          <a
            key={page.id}
            href={`#${page.id}`}
            className={`top-nav-link ${activePage === page.id ? "top-nav-link-active" : ""}`}
            aria-current={activePage === page.id ? "page" : undefined}
          >
            {page.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
