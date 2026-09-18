// These are the original portfolio pages, not copies of project content.
export const PROJECT_LINKS = Object.freeze({
  'terracurve-tower': '/projects/project2.html',
  'tensilebloom': '/projects/project5.html',
  'co-design-canvas': '/projects/project4.html',
  'spatial-ai': '/projects/project8.html',
  'manav': '/projects/project1.html',
  'nyc-carbon-atlas': '/projects/project3.html',
  'computational-modeling': '/projects/project7.html',
  'environmental-data-analysis': '/projects/project9.html',
  'emotionecho': '/projects/project6.html',
  'symbiotic-architecture': '/art/art4.html',
  'ai-future-cities': '/art/art3.html',
  'les-lieux-imaginaires': '/art/art2.html',
  'google-unfold': '/art/art1.html'
});

export function projectURL(id, origin) {
  if (!Object.hasOwn(PROJECT_LINKS, id)) return null;
  const url = new URL(PROJECT_LINKS[id], origin);
  url.searchParams.set('gallery', id);
  return url;
}
