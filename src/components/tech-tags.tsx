export function TechTags({ tags = [] }: { tags?: string[] }) {
  if (!tags.length) return null;
  return (
    <span className="tech-tags" aria-label="Required technologies">
      {tags.map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </span>
  );
}
