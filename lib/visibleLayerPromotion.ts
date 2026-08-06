type PromotionKind = 'text' | 'media'

/** Pre-promotes transformed layers near the viewport, then releases them. */
export function observeVisibleLayerPromotion(
  targets: Iterable<HTMLElement>,
  rootMargin = '18% 0px',
  kind: PromotionKind = 'text'
): () => void {
  const elements = Array.from(targets)
  if (!elements.length) return () => {}
  const attribute = kind === 'media' ? 'mediaLayerActive' : 'textLayerActive'
  const promote = (element: HTMLElement) => {
    element.dataset[attribute] = 'true'
  }
  const release = (element: HTMLElement) => {
    delete element.dataset[attribute]
  }

  if (!('IntersectionObserver' in window)) {
    elements.forEach(promote)
    return () => {
      elements.forEach(release)
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const element = entry.target as HTMLElement
        if (entry.isIntersecting) promote(element)
        else release(element)
      })
    },
    { rootMargin, threshold: 0 }
  )
  elements.forEach((element) => observer.observe(element))

  return () => {
    observer.disconnect()
    elements.forEach(release)
  }
}

