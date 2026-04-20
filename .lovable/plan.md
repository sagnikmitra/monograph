
Issue summary:
- The real problem is not “simple routing is impossible.” The problem is that `/unified` is failing at the server level before React even loads.
- I confirmed:
  - `https://unifiedmono.lovable.app` loads.
  - `https://unifiedmono.lovable.app/unified` returns raw `Not Found`.
  - `src/main.jsx` is using manual `window.location.pathname` / `hash` switching instead of a real browser router.
  - `src/Monograph.jsx` still links directly to `/unified`.
  - `vercel.json` exists, but Lovable docs say `vercel.json` rewrites are ignored on Lovable hosting.
  - Empty `unified/` and `unified-theory/` folders are still in the repo from earlier attempts.

Do I know what the issue is?
- Yes.
- Previous fixes were aimed at the wrong layer. The app is relying on unsupported rewrite config and custom path parsing instead of proper client-side routing aligned with Lovable hosting.

Exact problem:
- The published app needs a real browser-based SPA route setup for `/`, `/unified`, and `/unified-theory`.
- Right now it has ad-hoc route detection plus leftover hosting/multipage artifacts, so the published deep link is not being handled in a clean, supported way.

Implementation plan:
1. Remove conflicting routing artifacts
- Delete `vercel.json`.
- Delete the empty `unified/` and `unified-theory/` folders.
- Remove any leftover path/hash fallback assumptions that were added during earlier attempts.

2. Replace manual routing with a proper router
- Add `react-router-dom`.
- Wrap the app in `BrowserRouter`.
- Define explicit routes:
  - `/` → `Monograph`
  - `/unified` → `UnifiedTheory`
  - `/unified-theory` → `UnifiedTheory`
- Add a simple catch-all route so unmatched URLs do not fail silently.

3. Update navigation to stay inside the SPA
- Replace raw `<a href="/unified">` links in `src/Monograph.jsx` with router links/navigation.
- Replace the back link in `src/UnifiedTheory.jsx` so returning to `/` also stays client-side.

4. Keep math rendering and page content untouched
- Do not change the monograph/unified content structure unless needed for route-safe links.
- Keep KaTeX and existing page components as-is.

5. Verify the correct layer after implementation
- Confirm local preview works for:
  - `/`
  - `/unified`
  - `/unified-theory`
- Confirm direct URL entry and refresh on `/unified` work.
- Rebuild and then publish/update the frontend.

6. Final publish check
- After publishing, test the live URLs directly:
  - `https://unifiedmono.lovable.app/`
  - `https://unifiedmono.lovable.app/unified`
  - `https://unifiedmono.lovable.app/unified-theory`

Technical details:
- Files to edit:
  - `src/main.jsx`
  - `src/Monograph.jsx`
  - `src/UnifiedTheory.jsx`
  - `package.json`
- Files/directories to remove:
  - `vercel.json`
  - `unified/`
  - `unified-theory/`
- Why this is the right fix:
  - Lovable hosting already provides SPA fallback.
  - `vercel.json` is not used here.
  - A proper `BrowserRouter` setup is the supported way to make `/unified` a real deep link.
