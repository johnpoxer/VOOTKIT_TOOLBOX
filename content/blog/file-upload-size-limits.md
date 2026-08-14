---
title: "File Upload Size Limits (2026)"
slug: "file-upload-size-limits"
date: "2026-08-12"
description: "A practical 2026 reference for Gmail, Outlook, Discord, WhatsApp, Slack, YouTube, Google Drive, OneDrive and Dropbox upload limits."
thumbnail: "/assets/blog/file-upload-size-limits.jpg"
author: "The Vootkit team"
---

Most upload errors are badly explained. A service says a file is "too large", but it rarely tells you whether the problem is the raw file, the email message after encoding, your account tier, the browser upload path, or the person receiving it.

This guide is the practical version: the limits people hit most often, what they mean in real work, and which Vootkit tool to use when you need to get under the cap without handing a private file to a random upload server.

Last checked: August 12, 2026.

![Printed documents beside a laptop, representing files prepared for upload or sharing.](/assets/blog/file-upload-size-limits.jpg)

## Quick Reference Table

| Service | Common limit | What usually matters |
|---|---:|---|
| Gmail | 25 MB for personal accounts | Larger files become Drive links; leave room for message overhead. |
| Outlook.com | 25 MB attachments | OneDrive file links can be larger than direct attachments. |
| Desktop Outlook / Exchange | Often 20 MB for internet mail, 10 MB default for Exchange | Business admins can set different limits, so the recipient may be the bottleneck. |
| Discord | 10 MB base, 50 MB Nitro Basic, 500 MB Nitro | Some users or servers may see experiments, but 10 MB is the safe target for free users. |
| WhatsApp | 2 GB documents; videos commonly capped lower | Sending as a document and sending as media are not the same path. |
| Slack | 1 GB per uploaded file | Workspace storage and retention settings are separate from the single-file upload limit. |
| YouTube | 256 GB or 12 hours, whichever is lower | Unverified channels are limited to shorter uploads. |
| Google Drive | 750 GB uploaded/copied per day; files up to 5 TB in Workspace docs | Daily transfer caps matter before the theoretical file cap for most people. |
| OneDrive / SharePoint / Teams | 250 GB individual file limit | Microsoft recommends the sync app for files larger than a few GB. |
| Dropbox | 375 GB on dropbox.com, 2 TB with desktop/mobile apps | Very large browser uploads are more fragile than synced uploads. |

## The Two Rules That Prevent Most Failed Uploads

First, aim below the published limit, not at it. A 25 MB email attachment can fail even when the file in your folder says 24.6 MB, because email attachments are encoded for transport and the message body, headers, signatures and inline images all count. A safe email target is usually 18-20 MB for a "25 MB" mailbox.

Second, understand the upload path. WhatsApp documents, WhatsApp videos and WhatsApp status posts are different flows. Dropbox in a browser and Dropbox through the desktop app have different limits. OneDrive through sync is more reliable for huge files than dragging into a browser tab. A limit is rarely just "this service"; it is the service, account type, app, browser and destination combined.

## Gmail

For personal Gmail accounts, the direct attachment limit is 25 MB. If your attachment is larger, Gmail normally offers to put it in Google Drive and send a link instead.

The important catch is that the recipient has a limit too. If you send from Gmail to a small business mail server with a 10 MB receive limit, your message can still bounce. Compressing below the other side's limit is usually faster than arguing with email infrastructure.

Use Vootkit:

- [Compress PDF](/tools/pdf/compress-pdf/) for scanned PDFs, invoices and forms.
- [Image Compressor](/tools/images/compress-image/) for large photos.
- [Video Compressor](/tools/video/compress-video/) when a clip belongs in a message rather than a cloud link.

## Outlook And Microsoft 365

Outlook limits are easy to mix up because "Outlook" can mean Outlook.com, desktop Outlook, Exchange Online, Exchange Server, or a company mailbox with custom admin rules.

Microsoft lists 25 MB for Outlook.com attachments. It also documents lower common defaults for desktop and Exchange-style mail: 20 MB for many internet email accounts and 10 MB as a default Exchange business-mail message size. Microsoft 365 admins can raise message-size settings in some environments, but that does not make every recipient able to receive the same message.

The practical answer: if the file is for email, keep it under 18-20 MB. If it is bigger than that, use OneDrive, SharePoint or another file-share link, then send the link in the email.

## Discord

Discord is where most people discover upload limits because short clips are surprisingly large. Discord's current account caps list the file sharing limit as 10 MB for base accounts, 50 MB for Nitro Basic and 500 MB for Nitro. Discord also says it may experiment with different file-size limits for selected users or servers, so treat bigger free limits as a bonus rather than something to rely on.

For video, bitrate is the whole game. A one-minute clip at 8 Mbps is roughly 60 MB before audio and container overhead. To make that same minute fit under 10 MB, you need about 1.2-1.3 Mbps total. That is why a 1080p clip often needs to become 720p or 480p for Discord free uploads.

Use Vootkit:

- [Video Compressor](/tools/video/compress-video/) and set a target size just under 10 MB, 50 MB or 500 MB.
- [Trim Video](/tools/video/trim-video/) before compressing; deleting dead air preserves more quality than squeezing the entire clip harder.
- [Video to GIF](/tools/video/video-to-gif/) only for short loops. GIF is often much larger than MP4.

## WhatsApp

WhatsApp's document path allows files up to 2 GB. Video and image paths can have lower limits and extra processing rules; WhatsApp's help pages mention a default video limit of 100 MB and 720p for faster connections, and separate app-specific media flows may be stricter.

That distinction matters. If you want the recipient to receive the original file, send it as a document. If you want the clip to play inline in chat and behave like normal WhatsApp media, expect compression and lower practical limits.

Use Vootkit:

- [Video Compressor](/tools/video/compress-video/) for chat-ready clips.
- [Resize Image](/tools/images/resize-image/) before sending photo sets.
- [Compress Image](/tools/images/compress-image/) when a photo is just over the line.

## Slack

Slack's file-sharing page says files up to 1 GB can be uploaded from your device. That is generous for screenshots, PDFs and most exported videos, but it is still easy to hit with raw screen recordings or high-bitrate camera footage.

The single-file limit is not the only thing to think about. Workspace storage, retention rules and permissions can affect how long a file remains useful after upload. For work files that need to live for months, a Drive, OneDrive, Dropbox or Box link may be cleaner than uploading the binary directly to Slack.

## YouTube

YouTube's help page for longer uploads lists a maximum of 256 GB or 12 hours, whichever is less. Channels that are not verified are limited to shorter videos, so verification status can be the real issue even when the file size is fine.

For YouTube, the best fix is usually not aggressive compression. YouTube will transcode your upload anyway, so you want a clean source file: MP4, H.264 or another supported codec, stable frame rate, and enough bitrate that the first transcode has good material to work from.

Use Vootkit only when you need to solve a specific problem before upload: trimming a long mistake, reducing a file that your connection cannot push reliably, or converting a file your browser or editor produced awkwardly.

## Google Drive

Google's Drive API limits page says Workspace users can upload and copy 750 GB per day across My Drive and shared drives, and it notes a 5 TB maximum file size. For ordinary users, storage quota becomes the practical limit much sooner than 5 TB.

The daily cap is the surprise. If you move large video archives, backups or design files, Drive may stop you for 24 hours even when there is space left in the account.

## OneDrive, SharePoint And Teams

Microsoft documents a 250 GB limit for individual files in OneDrive and SharePoint, and that applies to Teams files because Teams stores channel files in SharePoint. Microsoft also recommends the sync app for files larger than a few GB.

The useful takeaway is simple: if a file is too big for Outlook, do not keep trying to attach it. Put it in OneDrive or SharePoint and send a link.

## Dropbox

Dropbox currently lists 375 GB for uploads through dropbox.com and 2 TB through the desktop or mobile apps. For very large files, the desktop app is the safer path because it can resume and sync more reliably than a browser tab.

For video teams, that means you normally should not compress a master file just to store it. Compress the copy you send for review, upload or chat, and keep the original untouched.

## What To Do When A File Is Just Over The Limit

If it is a PDF, try [Compress PDF](/tools/pdf/compress-pdf/) first. Scanned PDFs often contain huge images inside each page; compression can cut them dramatically. If the document is made of real text and vector graphics, the saving may be smaller because there is less waste to remove.

If it is a photo, resize before lowering quality. A 4000 px phone photo displayed at 1200 px is carrying pixels nobody will see. Use [Resize Image](/tools/images/resize-image/), then [Compress Image](/tools/images/compress-image/). That order keeps quality higher.

If it is video, trim before compressing. Removing ten seconds from a one-minute clip is a 17% saving before you touch quality. Then choose a target size in [Video Compressor](/tools/video/compress-video/) based on the table above.

If it is already a ZIP, do not expect miracles. ZIP, MP4, JPG, WebP and modern office formats are already compressed. Re-zipping them usually changes almost nothing.

## Sources

Limits change, so use this page as a practical guide and the official docs as the final authority:

- [Google Help: Gmail attachments](https://support.google.com/mail/answer/6584)
- [Microsoft Support: Outlook.com sending limits](https://support.microsoft.com/en-us/outlook/sending-limits-in-outlook-com)
- [Microsoft Support: reduce attachment size in Outlook](https://support.microsoft.com/en-us/outlook/reduce-attachment-size-to-send-large-files-with-outlook)
- [Discord Support: file attachments FAQ](https://support.discord.com/hc/en-us/articles/25444343291031-File-Attachments-FAQ)
- [Discord Support: account caps](https://support.discord.com/hc/en-us/articles/33694251638295-Discord-Account-Caps-Server-Caps-and-More)
- [WhatsApp Help Center: sending media and documents](https://faq.whatsapp.com/453914586839706)
- [Slack: file sharing](https://slack.com/features/document-sharing)
- [YouTube Help: maximum upload size](https://support.google.com/youtube/answer/71673)
- [Google Drive API limits](https://developers.google.com/workspace/drive/api/guides/limits)
- [Microsoft Support: OneDrive and SharePoint restrictions](https://support.microsoft.com/en-us/onedrive/restrictions-and-limitations-in-onedrive-and-sharepoint)
- [Dropbox Help: upload limitations](https://help.dropbox.com/sync/upload-limitations)
