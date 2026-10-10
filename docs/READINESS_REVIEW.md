# VOOTKIT readiness review — 10 October 2026

## AdSense assessment

Not yet confirmed ready to reapply. The owner reports an earlier low-content rejection. Only Google can approve the site; this review is not an approval guarantee.

The source contains 198 blog articles. Automated checks found no identical complete article bodies, missing article thumbnails, future publication dates, or missing local references on the homepage, About, Privacy, Cookies, Security, Contact, Blog, Pricing and video-compressor pages. Article body word counts range from approximately 505 to 1,706. Word count is not a Google eligibility threshold and does not establish originality or usefulness.

An overlap check found 77 tool-guide articles containing long passages also used in their corresponding tool descriptions. Review those guides for independent value: a worked example with real inputs and outputs, specific limitations, troubleshooting and verified sources. Do not invent testing results or merely increase word count. The overlap is a review flag, not proof that Google will reject a particular page.

This change retains the original visual design, makes the shared authentication control visible on mobile while hiding duplicate navigation links, replaces repeated homepage photographs, corrects unsupported instant-processing and priority-server claims, removes advertising from unfinished tools, and adds Google's advertising-cookie disclosures and opt-out links. Seven guide links now name the actual exchange-rate provider.

Before reapplying:

1. Publish the reviewed changes to www.vootkit.com and verify the production pages, ads.txt and crawl access. A deploy preview does not update production.
2. Review the guides flagged for reused passages and confirm that substantive articles provide additional value beyond the corresponding tools.
3. Configure and verify a Google-certified TCF consent platform for personalized advertising in the EEA, UK and Switzerland. The existing custom preference banner is not evidence of certification. Google's AdSense Privacy & messaging offering is an account-side option.
4. Check the AdSense Sites and Policy Center screens for the exact rejection wording and outstanding account-specific issues. Those screens have not been inspected in this review.

Sources: https://support.google.com/adsense/answer/7299563 ; https://support.google.com/adsense/answer/13554116 ; https://support.google.com/adsense/answer/1348695 ; https://support.google.com/publisherpolicies/answer/11112688

## Media processing server

Netlify currently hosts the website. Video encoding runs on the visitor's device through single-threaded browser FFmpeg. Adding another static web host will not make encoding faster.

Candidate: DigitalOcean 4 vCPU / 8 GiB Basic Droplet at $48/month for a pilot; 4 dedicated vCPU / 8 GiB CPU-Optimized Droplet at $84/month for sustained encoding. Prices were checked against https://www.digitalocean.com/pricing/droplets on the review date. Taxes, optional backups and overages may add cost. No account or paid server has been created and no encoding benchmark has been run.

The server implementation needs native FFmpeg, a bounded job queue, authenticated upload and download endpoints, progress and cancellation, file-size and duration limits, temporary-file expiry, HTTPS, process resource limits and monitoring. Begin with video compression, benchmark representative clips, then extend to other compatible tools. Preserve the current local mode and make upload processing an explicit user choice; update privacy disclosures before enabling uploads.

Do not advertise guaranteed seconds: upload speed, video length, resolution, codec, selected quality and concurrent jobs determine total time. Choose the monthly budget and establish the hosting account before deployment.
