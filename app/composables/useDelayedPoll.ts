/**
 * Returns a scheduler that runs `tick` once after `intervalMs`, replacing any pending run, and
 * cancels it when the component unmounts. A tick keeps polling by scheduling itself again.
 */
export function useDelayedPoll(intervalMs = 2000) {
  let timeout: ReturnType<typeof setTimeout> | undefined
  onUnmounted(() => clearTimeout(timeout))

  return (tick: () => Promise<void>) => {
    clearTimeout(timeout)
    timeout = setTimeout(tick, intervalMs)
  }
}
