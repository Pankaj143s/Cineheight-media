declare module 'three'

declare module 'vanta/dist/vanta.birds.min' {
  type VantaEffect = { destroy: () => void }
  type VantaFactory = (options: Record<string, unknown>) => VantaEffect

  const BIRDS: VantaFactory
  export default BIRDS
}
