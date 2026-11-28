/**
 * Opened from an "https://user:pass@host" address (i.e. a bookmark for an instance behind an htpasswd
 * basic auth), Firefox keeps the credentials in the document URL: every relative fetch() then resolves to
 * an URL with embedded credentials and is refused ("is an url with embedded credentials"), so the API is
 * unreachable. window.location hides them, document.URL doesn't.
 *
 * The browser already used them for the basic auth and keeps them for the session: reload once on the
 * same address without them. history.replaceState() can't be used, it may not change the credentials.
 */
export default defineNuxtPlugin({
  name: 'strip-url-credentials',
  enforce: 'pre',
  setup() {
    const url = new URL(document.URL)
    if (url.username || url.password) {
      url.username = ''
      url.password = ''
      window.location.replace(url.href)
    }
  }
})
