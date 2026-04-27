export function generateStoryFromSource(sourceItem, { autoPublish }) {
  const now = new Date().toISOString();
  const categoryLabel = sourceItem.categorySlug.replace(/-/g, " ");

  const headline = sourceItem.title;
  const summary = sourceItem.summary || `Latest ${categoryLabel} update sourced from market/news feeds.`;

  const storyBody = [
    `This automated story was generated for the ${categoryLabel} desk based on the latest source feed item.`,
    `Source headline: ${sourceItem.title}`,
    `Key context: ${summary}`,
    sourceItem.marketSignal
      ? `Market signal snapshot: ${sourceItem.marketSignal}`
      : "No additional market-signal payload was attached to this source item.",
    "Editorial note: this is phase-1 auto-generated content. Add review workflows and model-based summarization before production publishing."
  ].join("\n\n");

  return {
    sourceItemId: sourceItem.id,
    categorySlug: sourceItem.categorySlug,
    headline,
    summary,
    storyBody,
    tagsJson: JSON.stringify([sourceItem.categorySlug, "auto-generated", sourceItem.provider]),
    confidenceScore: sourceItem.provider === "mock" ? 0.45 : 0.72,
    generationModel: "rules-v1",
    generationStatus: "generated",
    editorialStatus: autoPublish ? "published" : "review_required",
    publishedAt: autoPublish ? now : null
  };
}
