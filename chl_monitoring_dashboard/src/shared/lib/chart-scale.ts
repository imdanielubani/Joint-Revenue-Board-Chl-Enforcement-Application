/**
 * A value axis from 0 with round steps (1, 2 or 5 × a power of ten) and
 * about `targetSteps` gridlines, tall enough for `max`.
 */
export function niceTicks(max: number, targetSteps = 5): number[] {
  if (!(max > 0)) return [0, 1, 2, 3, 4, 5]
  const rough = max / targetSteps
  const power = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 5, 10].map((m) => m * power).find((candidate) => candidate >= rough) ?? power
  // Counts are whole numbers, so steps below 1 make no sense.
  const wholeStep = Math.max(1, step)
  const top = Math.ceil(max / wholeStep) * wholeStep
  const ticks: number[] = []
  for (let value = 0; value <= top; value += wholeStep) ticks.push(value)
  return ticks
}

/** Where point `index` of `count` sits across the width, 0–1; a single point sits in the middle. */
export function pointX(index: number, count: number): number {
  return count <= 1 ? 0.5 : index / (count - 1)
}
