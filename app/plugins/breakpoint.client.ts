import {watchBreakpoint} from "~/utils/browser";

export default defineNuxtPlugin(() => {
  watchBreakpoint()
  window.addEventListener('resize', watchBreakpoint)
})
