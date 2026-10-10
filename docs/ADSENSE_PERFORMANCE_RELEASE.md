# VOOTKIT performance and AdSense release

The site already uses Netlify CDN hosting and serverless functions. This change adds a server-side cache for public exchange rates, retains on-device file processing, enables an explicit five-minute Netlify HTML cache, defers homepage catalog scripts, and includes home-v2.css in build cache versioning.

The exchange-rates function uses no secrets. Netlify needs a supported Node runtime with native fetch (Node 22 or later). Responses vary by base currency, share the durable CDN cache for one hour, and show the provider's update time. Failed requests are never cached. The existing browser cache remains. File processing is unchanged.

## AdSense checks

- Publisher ID: ca-pub-5906583727409402. Existing configured ad slots are retained.
- Verify the live /ads.txt contains the publisher's Google seller entry.
- Confirm Google can reach the site and its crawler is allowed by robots.txt.
- Check published About, Contact, Privacy, Cookies, Terms and Disclaimer pages.
- Keep ads separate from upload, process and download controls. Verify Pro accounts remain ad-free.
- Confirm all submitted pages provide useful original content and functioning tools; planned tools should remain noindex and ad-free.
- Configure and publish a Google-certified TCF consent message in AdSense Privacy & messaging for EEA, UK and Switzerland. The site's custom two-button banner and Google Consent Mode are not a certified TCF CMP. Do not treat the custom banner as proof this requirement is fulfilled.
- Verify consent choices, including rejection, in an affected region before activating personalized ads there. Check that the certified CMP and custom banner do not compete.
- Check the AdSense Sites and Policy center statuses before requesting review. Approval is Google's decision.

Google requirements: https://support.google.com/adsense/answer/12176698 and https://support.google.com/adsense/answer/13554116.

## Release validation

Run npm run build, npm test and node test/exchange-rates.test.js. Check the deploy preview on mobile and desktop, the homepage newsletter, tool menus, nested cookie links, and /.netlify/functions/exchange-rates?base=USD. Check Netlify response headers and cache hits before comparing speed. No measured speed improvement is claimed before deployment.

After deployment, compare Core Web Vitals and successful tool runs with the previous release. An additional general-purpose file server requires a separate design for uploads, retention and large-file jobs; it should not be added without a specific processing bottleneck.
