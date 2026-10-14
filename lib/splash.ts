/**
 * Animated launch splash for the Android app.
 *
 *  1. The pulse mark sits white on navy, exactly like the native splash screen, so the hand-over is invisible.
 *  2. A blue scan sweeps along the line like a monitor trace.
 *  3. The mark glides left and shrinks while "Clinexia" slides in letter by letter (C first, each letter from the right).
 *  4. A heartbeat, then the mark and the word fly to the real logo and name in the home header, the navy curtain lifts
 *     to the header's height, and the real header takes over.
 *
 * Plays once per cold start, only inside the Android app (or in a browser with ?splash=1 for previews).
 * Tap anywhere to skip. With "reduce motion" on, it simply fades.
 *
 * Everything the overlay needs is in the static HTML, so it covers the screen from the very first paint.
 */

export const SPLASH_ID = "clinexia-splash"
const SEEN_KEY = "clx:splash"

/** All timings in milliseconds, measured from the moment the animation starts. */
export const SPLASH_TIMING = {
  scanMs: 650,        // blue scan along the line
  moveDelay: 450,     // mark starts gliding left
  moveMs: 650,
  letterStart: 620,   // first letter (C) starts entering
  letterStagger: 55,  // delay between letters
  letterMs: 420,
  beatDelay: 1300,    // heartbeat
  beatMs: 380,
  landAt: 1750,       // lockup flies to the header
  landMs: 620,
  skipLandMs: 260,    // used when the user taps to skip
  fallbackMs: 6000,   // overlay is always gone by now
} as const

const WORD = "Clinexia"
const LOGO_COLOR = "#2563eb"
const BASE_FONT_PX = 38        // wordmark size in the lockup; the header uses 16px, so the ratio is 2.375
const HEADER_FONT_PX = 16
const HEADER_GAP_EM = 10 / 16  // header gap-2.5 (10px) at 16px

// The pulse, traced from public/icon-512x512.png (viewBox 0 0 512 512). pathLength=100 keeps the dash maths simple.
const PULSE = "M102.2 255.6 L141.2 255 L170.3 232.9 L209.9 104.8 L302.1 406.2 L341.7 278.1 L370.8 256 L409.8 255.4"

export const SPLASH_HTML =
  `<div class="clx-bg"></div>` +
  `<svg class="clx-mark" viewBox="0 0 512 512" focusable="false"><g class="clx-beat">` +
  `<path class="clx-base" pathLength="100" d="${PULSE}"/>` +
  `<path class="clx-scan" pathLength="100" d="${PULSE}"/>` +
  `</g></svg>` +
  `<div class="clx-word">${[...WORD].map((c, i) => `<span class="clx-l" data-i="${i}">${c}</span>`).join("")}</div>`

export const SPLASH_CSS = `
#${SPLASH_ID}{display:none}
html[data-splash] #${SPLASH_ID}{display:block;position:fixed;inset:0;z-index:2147483000;overflow:hidden;touch-action:manipulation;-webkit-tap-highlight-color:transparent;--s0:45.6vmin;--f:${BASE_FONT_PX}px}
#${SPLASH_ID} .clx-bg{position:absolute;inset:0;background:var(--navy,#073a68);clip-path:inset(0 0 0 0)}
#${SPLASH_ID} .clx-mark{position:absolute;left:50%;top:50%;width:var(--s0);height:var(--s0);margin:calc(var(--s0) / -2) 0 0 calc(var(--s0) / -2);overflow:visible;will-change:transform}
#${SPLASH_ID} .clx-beat{transform-box:fill-box;transform-origin:50% 50%}
#${SPLASH_ID} .clx-base,#${SPLASH_ID} .clx-scan{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-width:30.3}
#${SPLASH_ID} .clx-base{stroke:#fff}
#${SPLASH_ID} .clx-scan{stroke:#60a5fa;stroke-dasharray:30 130;stroke-dashoffset:30;opacity:0}
#${SPLASH_ID} .clx-word{position:absolute;left:calc(50% + var(--wl,0px));top:calc(50% - var(--f) / 2);height:var(--f);display:flex;align-items:center;white-space:nowrap;font:800 var(--f)/1 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;letter-spacing:-.025em;color:#fff;transform-origin:0 50%;will-change:transform}
#${SPLASH_ID} .clx-l{display:inline-block;opacity:0;will-change:transform,opacity}
html[data-splash] [data-clx]{transition:opacity .18s ease}
html[data-splash="1"] [data-clx]{opacity:0}
`

/** Inline <head> script: switches the overlay on before first paint (Android app, or ?splash=1), once per session. */
export const SPLASH_INIT = `(function(){try{var d=document.documentElement,c=window.Capacitor,n=!!(c&&typeof c.isNativePlatform==="function"&&c.isNativePlatform()),f=/[?&]splash=1/.test(location.search);if(f||(n&&!sessionStorage.getItem("${SEEN_KEY}")))d.setAttribute("data-splash","1")}catch(e){}})()`

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
let started = false

function shouldRun(html: HTMLElement): boolean {
  if (html.hasAttribute("data-splash")) return true
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
    const native = !!(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform())
    const preview = /[?&]splash=1/.test(location.search)
    if (preview || (native && !sessionStorage.getItem(SEEN_KEY))) {
      html.setAttribute("data-splash", "1")
      return true
    }
  } catch {}
  return false
}

/** Starts the splash. Safe to call more than once; does nothing outside the app. */
export function runSplash(): void {
  if (typeof document === "undefined" || started) return
  const html = document.documentElement
  const root = document.getElementById(SPLASH_ID)
  if (!root || !shouldRun(html)) return
  started = true
  try { sessionStorage.setItem(SEEN_KEY, "1") } catch {}
  void play(root, html).catch(() => cleanup(root, html))
}

function cleanup(root: HTMLElement, html: HTMLElement) {
  root.style.display = "none"
  root.innerHTML = ""
  html.removeAttribute("data-splash")
}

async function play(root: HTMLElement, html: HTMLElement) {
  const T = SPLASH_TIMING
  const fallback = setTimeout(() => cleanup(root, html), T.fallbackMs)
  const q = <E extends Element>(sel: string) => root.querySelector(sel) as E

  const bg = q<HTMLElement>(".clx-bg")
  const mark = q<SVGSVGElement>(".clx-mark")
  const beat = q<SVGGElement>(".clx-beat")
  const base = q<SVGPathElement>(".clx-base")
  const scan = q<SVGPathElement>(".clx-scan")
  const word = q<HTMLElement>(".clx-word")
  const letters = Array.from(root.querySelectorAll<HTMLElement>(".clx-l"))

  const logoT = document.querySelector<HTMLElement>('[data-clx="logo"]')
  const wordT = document.querySelector<HTMLElement>('[data-clx="word"]')
  const headerEl = document.querySelector<HTMLElement>("header")
  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches

  const finish = async () => {
    clearTimeout(fallback)
    html.setAttribute("data-splash", "done") // real header logo and name fade in underneath
    await sleep(220)
    cleanup(root, html)
  }

  // Without a header to land on (or with reduced motion) just hold the mark briefly and let it fade away.
  if (reduced || !logoT || !wordT || !headerEl) {
    await sleep(reduced ? 350 : 600)
    clearTimeout(fallback)
    await root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: "forwards" }).finished.catch(() => {})
    html.setAttribute("data-splash", "done")
    await sleep(200)
    cleanup(root, html)
    return
  }

  await Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), sleep(350)])

  // ---- measure and lay out the final lockup (mark, gap, word), centred on screen
  const s0 = mark.getBoundingClientRect().width
  let f = BASE_FONT_PX
  let ww = word.getBoundingClientRect().width
  const fits = (innerWidth - 48) / (f * 2 + f * HEADER_GAP_EM + ww)
  if (fits < 1) { f *= fits; ww *= fits; root.style.setProperty("--f", `${f}px`) }
  const s1 = f * 2                    // mark box in the lockup (header: 32px icon next to 16px text)
  const gap = f * HEADER_GAP_EM
  const k1 = s1 / s0
  const mx = -(gap + ww) / 2          // mark centre, relative to screen centre
  const wl = (s1 + gap - ww) / 2      // word left edge, relative to screen centre
  word.style.setProperty("--wl", `${wl}px`)

  // ---- animations
  const anims: Animation[] = []
  const add = (a: Animation) => (anims.push(a), a)
  const ease = "cubic-bezier(.22,1,.36,1)"

  add(scan.animate(
    [{ strokeDashoffset: 30, opacity: 0 }, { strokeDashoffset: 8, opacity: 1, offset: 0.12 }, { strokeDashoffset: -88, opacity: 1, offset: 0.9 }, { strokeDashoffset: -100, opacity: 0 }],
    { duration: T.scanMs, easing: "linear", fill: "forwards" },
  ))
  add(mark.animate(
    [{ transform: "translate(0px,0px) scale(1)" }, { transform: `translate(${mx}px,0px) scale(${k1})` }],
    { duration: T.moveMs, delay: T.moveDelay, easing: ease, fill: "forwards" },
  ))
  letters.forEach((el, i) => add(el.animate(
    [{ opacity: 0, transform: "translateX(0.9em)" }, { opacity: 1, transform: "translateX(0)" }],
    { duration: T.letterMs, delay: T.letterStart + i * T.letterStagger, easing: ease, fill: "both" },
  )))
  add(beat.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.14)", offset: 0.4 }, { transform: "scale(1)" }],
    { duration: T.beatMs, delay: T.beatDelay, easing: "ease-in-out" },
  ))

  // ---- landing: fly to the real header logo and name, lift the curtain to the header's height, hand over
  let landed = false
  const land = (duration: number) => {
    if (landed) return
    landed = true
    anims.forEach((a) => { try { a.finish() } catch {} })
    scan.style.display = "none"
    root.style.pointerEvents = "none"

    const vw = innerWidth / 2
    const vh = innerHeight / 2
    const lr = logoT.getBoundingClientRect()
    const wr = wordT.getBoundingClientRect()
    const hr = headerEl.getBoundingClientRect()
    const sMark = lr.width / s0
    const sWord = parseFloat(getComputedStyle(wordT).fontSize || `${HEADER_FONT_PX}`) / f
    const opts: KeyframeAnimationOptions = { duration, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" }

    const done = [
      mark.animate(
        [{ transform: `translate(${mx}px,0px) scale(${k1})` }, { transform: `translate(${lr.left + lr.width / 2 - vw}px,${lr.top + lr.height / 2 - vh}px) scale(${sMark})` }],
        opts,
      ),
      word.animate(
        [{ transform: "translate(0px,0px) scale(1)" }, { transform: `translate(${wr.left - (vw + wl)}px,${wr.top + wr.height / 2 - vh}px) scale(${sWord})` }],
        opts,
      ),
      bg.animate([{ clipPath: "inset(0px 0px 0px 0px)" }, { clipPath: `inset(0px 0px ${Math.max(0, innerHeight - hr.bottom)}px 0px)` }], opts),
      base.animate([{ stroke: "#ffffff" }, { stroke: LOGO_COLOR }], { duration: duration * 0.8, delay: duration * 0.1, fill: "forwards" }),
    ]
    void Promise.all(done.map((a) => a.finished)).then(finish, finish)
  }

  const landTimer = setTimeout(() => land(T.landMs), T.landAt)
  root.addEventListener("click", () => { clearTimeout(landTimer); land(T.skipLandMs) }, { once: true })
}
