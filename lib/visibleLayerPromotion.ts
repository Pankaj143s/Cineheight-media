/**
 * Keeps transformed text crisp while it is on screen without permanently
 * reserving compositor memory for every scene on a long route.
 */
export function observeVisibleLayerPromotion(
  targets: Iterable<HTMLElement>,
  rootMargin = '18% 0px'
): () => void {
  const elements = Array.from(targets)
  if (!elements.length) return () => {}

  if (!('IntersectionObserver' in window)) {
    elements.forEach((element) => {
      element.dataset.textLayerActive = 'true'
    })
    return () => {
      elements.forEach((element) => delete element.dataset.textLayerActive)
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const element = entry.target as HTMLElement
        if (entry.isIntersecting) element.dataset.textLayerActive = 'true'
        else delete element.dataset.textLayerActive
      })
    },
    { rootMargin, threshold: 0 }
  )
  elements.forEach((element) => observer.observe(element))

  return () => {
    observer.disconnect()
    elements.forEach((element) => delete element.dataset.textLayerActive)
  }
}
