# Idea Scorecard

Updated: 2026-10-24. Research executed 2026-10-24 via three parallel research agents (Reddit, official pricing pages, G2/Capterra, community forums). All URLs dated where the source showed a date; items marked UNVERIFIED could not be confirmed and are not used as decision evidence.

Scoring: 1-5 per dimension. Pain = documented urgency. WTP = evidence people pay for this today. Recurrence = how often the need returns. Reach = can a solo founder reach buyers without ads. Diff = room to differentiate from named incumbents. Retention = natural stickiness. Margin = cost to serve vs price. Speed = solo build time to real MVP. Excluded up front per founder constraints: n8n handovers (HandoffKit owns this), generic AI wrappers, consumer apps, marketplaces, high-liability advice, capital-heavy, costly AI/data dependencies.

| # | Idea | Pain | WTP | Recur | Reach | Diff | Retn | Marg | Speed | Total /40 |
|---|------|------|-----|-------|-------|------|------|------|-------|-----------|
| 1 | Branded monthly care-plan reports for mixed-stack web agencies | 5 | 4 | 5 | 4 | 4 | 5 | 5 | 4 | 36 |
| 2 | Client review/approval workflow, flat price, micro-agencies | 4 | 3 | 5 | 3 | 3 | 4 | 4 | 3 | 29 |
| 3 | White-label uptime + SSL + change monitoring bundle for agencies | 4 | 3 | 5 | 3 | 2 | 4 | 4 | 4 | 29 |
| 4 | Changelog / release-notes widget for SaaS | 2 | 3 | 4 | 4 | 1 | 4 | 5 | 5 | 28 |
| 5 | Shopify store health monitoring, flat agency tier | 3 | 3 | 4 | 3 | 4 | 4 | 3 | 2 | 26 |
| 6 | Testimonial / social-proof collection | 3 | 3 | 4 | 3 | 1 | 4 | 4 | 4 | 26 |
| 7 | Form spam protection for WordPress/static | 5 | 2 | 5 | 4 | 1 | 3 | 2 | 3 | 25 |
| 8 | SSL/domain-expiry-only monitoring (Little Warden style) | 4 | 3 | 5 | 3 | 2 | 5 | 5 | 5 | 32* |
| 9 | Care-plan proposal/quoting tool for agencies | 3 | 2 | 2 | 3 | 2 | 2 | 4 | 4 | 22 |
| 10 | White-label SEO audit reports | 3 | 3 | 4 | 3 | 2 | 4 | 2 | 2 | 23 |

* Idea 8 scores well standalone but is a strict subset of Idea 1's check engine with weaker differentiation against Little Warden (GBP 24.99/mo, 24 checks) and TLDTrack ($11/mo); it is folded into Idea 1 rather than run separately.

## Evidence per idea

### 1. Care-plan reports for mixed-stack agencies (CHOSEN)
- Pain: agencies on $50-300/mo per-site retainers must prove monthly work. ManageWP built Client Reports because demand exists; recurring "which maintenance tool" threads on r/Wordpress (11g8j42 Feb 2023; 119qxva Feb 2023; 1nngay4 ~Sep 2025; 1t3cwvn 2025; 132g4m0 2023). MicroGaps gap analysis (~2025) describes freelancers assembling "monthly client reports manually (uptime screenshots, update logs pasted into Google Docs), a recurring, disliked chore". Counter-evidence: no single thread verbatim says "I hate compiling reports"; pain is adjacent-documented, not screamed.
- WTP: ManageWP Client Report $1/site/mo or $25/mo for 100 sites (managewp.com/pricing, checked 2026-10-24); MainWP $29/mo or $199/yr (mainwp.com/signup via G2, checked 2026-10-24); Pulsetic Freelancer $29/mo (pulsetic.com/pricing, checked 2026-10-24); Databox white-label reporting $200+/mo (search result, UNVERIFIED exact). Money flows today in this exact category.
- Recurrence: monthly by definition, tied to retainer contracts; churn only if the agency loses clients.
- Reach: recurring Reddit threads on r/Wordpress, r/web_design, r/agency; Facebook groups (Advanced WordPress, WP freelancers groups, one lists ~76k members); thewp.world agency directory; WP Tavern audience. No ads needed.
- Differentiation: incumbents are WordPress-only (ManageWP, MainWP, WP Umbrella ~EUR 1.99/site) or uptime-only with no care report (Pulsetic). ManageWP's free report tier is watermarked and sent from a ManageWP address (verified on feature page 2026-10-24). A no-plugin, any-stack (WordPress + Webflow + Shopify + custom) report-first tool with white-label at every paid tier and flat pricing occupies an empty slot.
- Retention: the report goes to the agency's client every month; stopping it creates a visible gap.
- Margin: deterministic HTTP/TLS/DNS checks, no AI, no paid data. Cost near zero at MVP scale.
- Speed: solo buildable in days; check engine is standard Node fetch/tls code.
- Risks/counter-evidence: ManageWP at $1/site is cheap and entrenched in WP-only shops; the wedge depends on mixed-stack agencies being a big enough segment; "report" without the underlying maintenance work (updates, backups) is shallower than ManageWP's story. Mitigation: position as proof-of-care layer over whatever maintenance stack they use, not a maintenance tool replacement.

### 2. Approval workflow, flat price (backup #1)
- Pain: r/Adobe thread (Apr 2024) asks for cheaper Ziflow/Frame.io alternatives; r/graphic_design (Mar 2025) notes Ziflow ~$1,000/yr for 5 seats; r/agency (~Oct 2026) shows teams leaving proofing tools for cost/complexity.
- Pricing checked 2026-10-24: Filestage $199/mo annual, Ziflow $199/mo (white-label Enterprise only), PageProof $249/mo. BUT budget per-seat options exist: GoVisually $16/user/mo, ReviewStudio $12/user/mo, Frame.io $15/user/mo. The "$150+/mo only" premise fails at the low end; wedge narrows to flat-price + white-label + messenger-friendly links. Retention high (every project), build medium (file handling).

### 3. Uptime + SSL + change bundle (rejected as primary, folded into #1's engine)
- Uptime Kuma (free, self-hosted) is the default answer in Reddit threads, a hard pricing ceiling. Pulsetic white-label from $19/mo (pulsetic.com, 2026-10-24), Better Stack $29-34/license, Visualping from $10/mo, Little Warden GBP 24.99-149.99/mo, undercutters TLDTrack $11/mo and Janitor $15/mo. Space already racing to the bottom.

### 4. Changelog widget (rejected)
- r/SaaS thread (~late 2025): "$49/mo for a changelog is definitely overkill". But Headway at $29/mo plus dozens of cheaper-than-AnnounceKit clones (FeatureOS, Featurebase, Releasepad pages all live 2026-10-24) fill the budget slot. Most contested band of the researched spaces.

### 5. Shopify store health (backup #2)
- Least crowded: ThemeWatchers domain dead (checked 2026-10-24), no flat multi-store agency tier found; Revenue Shield $39-199/mo per journey (apps.shopify.com). BUT pain evidence thinnest of all (inferred mostly from tool marketing; community threads unreachable or undated), Shopify app review adds launch friction, synthetic checkout testing is fragile and heavier to build. Would revisit only if Idea 1 validation fails and Idea 2 also fails.

### 6. Testimonial collection (rejected)
- Senja $29/mo and Testimonial.to $25/mo already own the indie slot (checked 2026-10-24); r/SideProject shows constant free clones; r/buildinpublic "Proofy: 0 customers in 30 days" is a direct saturation signal. Trust (usetrust.io) closing end of 2026 creates only a small migration window.

### 7. Form spam (rejected)
- Pain is loud (r/Wordpress "Getting spammed like crazy" ~Oct-Nov 2025; "Persistent spam in 2025" Apr 2025; r/ProWordPress Apr 2025) but free stack (Cloudflare Turnstile + honeypot + WAF) is the accepted fix in those same threads, CleanTalk sells ~$12/yr, and winning needs a continuously funded detection model. Arms race, not a solo margin story.

### 8. Expiry-only monitoring (folded into #1)
- See note above. Little Warden already does 24 checks incl. domain/SSL/expiry at GBP 24.99-149.99/mo; as a standalone product the only lever is price.

### 9. Care-plan proposal/quoting tool (rejected)
- Adjacent to the r/web_design retainer-scoping thread (1t5m9ox) but one-off value at quote time; no recurring need, weak retention. Better folded into Idea 1 as a template asset later.

### 10. White-label SEO audits (rejected)
- Needs paid SERP/data APIs for credible audits (cost + dependency), and SE Ranking/Ahrefs-adjacent tools already white-label. Margin and speed both poor for a solo founder.

## Top-3 detail (Idea 1 chosen; 2 and 5 are backups)

### Idea 1: CareProof (working name) - branded monthly care reports for any-stack agencies
- ICP: solo freelancers and 2-15 person web agencies in English-speaking markets running monthly care/maintenance retainers ($50-300/site/mo) across mixed stacks (WordPress + Webflow + Shopify + custom builds), managing 10-80 client sites.
- Current workaround: ManageWP reports (WordPress-only, watermarked free tier), MainWP self-hosted (clunky, WP-only), Pulsetic status pages (no report), or manual Google Docs + screenshots.
- Trigger events: monthly retainer reporting day; a client asking "what am I paying you for?"; signing a new retainer client; raising retainer prices.
- Competitors: ManageWP ($1/site/mo, WP-only), MainWP ($29/mo, self-hosted, WP-only), Pulsetic ($12-29/mo, any-stack, uptime only), WP Umbrella (~EUR 1.99/site, WP-only, UNVERIFIED), Databox ($200+/mo, general dashboards).
- Wedge: no plugin to install, works on any stack, white-label included on every paid tier, flat pricing, report-first (a client-ready branded monthly report in minutes).
- Price: Starter $19/mo (15 sites), Studio $49/mo (50 sites, client portal), Agency $99/mo (150 sites, team + API). Annual = 10x monthly.
- Bottom-up path to $2k MRR: 25 Studio + 15 Starter + 8 Agency = $2,302 MRR (targets, not a forecast). Sequence: 3 paid pilots from direct outreach (weeks 1-2), 10 paying by end of month 2 via niche communities and directories, 48 by month 5 assuming ~3.5% monthly lead-to-paid and low early churn. Every number here is a target to validate, not evidence.

### Idea 2 backup profile (approval workflow)
- ICP: 2-5 person design/video studios with non-technical clients; workaround: email/WhatsApp rounds + Figma links; trigger: version mixup or missed approval; competitors: GoVisually $16/user, ReviewStudio $12/user, Filestage $199+; wedge: flat $29-49 white-label, no per-seat; price $39/mo; path: 50 x $39 = $1,950 MRR.

### Idea 5 backup profile (Shopify store health)
- ICP: Shopify Partners managing 10+ stores; workaround: per-store monitors + manual audits; trigger: client store breaks silently; competitors: Revenue Shield $39+/mo per journey, getuptime.co ~$29/store (UNVERIFIED); wedge: flat multi-store agency tier + white-label reports; price $49-79/mo; path: 30-40 agencies. Validate demand in r/ShopifyPartners first: evidence currently thinnest of the three.

## Research source log (2026-10-24)
- https://www.reddit.com/r/Wordpress/comments/11g8j42/managewp_yes_or_no (2023-02)
- https://www.reddit.com/r/Wordpress/comments/119qxva/managewp_alternative (~2023-02, date inferred)
- https://www.reddit.com/r/Wordpress/comments/1nngay4/mainwp_managewp_users_worth_it_or_nah (~2025-09, UNVERIFIED)
- https://www.reddit.com/r/Wordpress/comments/1t3cwvn/managing_80_wp_installs_which_tool (2025, UNVERIFIED)
- https://www.reddit.com/r/Wordpress/comments/132g4m0/sick_of_managewp_and_thinking_about_going_back_to (2023)
- https://www.reddit.com/r/web_design/comments/1t5m9ox/what_do_you_include_in_monthly_website (recent, UNVERIFIED)
- https://www.reddit.com/r/agency/comments/1log13u/am_i_charging_too_much_for_my_websites (2026, UNVERIFIED)
- https://www.microgaps.com/gaps/wordpress-maintenance-retainer-client-hub (~2025, UNVERIFIED)
- https://managewp.com/features/client-report + https://managewp.com/pricing (checked 2026-10-24)
- https://mainwp.com/signup/ + https://www.g2.com/products/mainwp/pricing (checked 2026-10-24)
- https://pulsetic.com/pricing/ + https://pulsetic.com/white-label-website-monitoring (checked 2026-10-24)
- https://littlewarden.com (checked 2026-10-24)
- https://uptimerobot.com/pricing + https://betterstack.com/pricing + https://visualping.io/pricing (checked 2026-10-24)
- https://www.reddit.com/r/Adobe/comments/1c7xvay/good_alternatives_for_ziflow_and_frameio_for (2024-04)
- https://www.reddit.com/r/graphic_design/comments/1j9l2uh/proofing_systems (2025-03)
- https://www.reddit.com/r/agency/comments/1tpk0ex/how_are_you_handling_client_design_feedback (~2026-10)
- Filestage/Ziflow/PageProof/GoVisually/ReviewStudio/Frame.io pricing pages (checked 2026-10-24)
- Senja/Testimonial.to/Vocal Video/usetrust.io pricing (checked 2026-10-24)
- https://www.reddit.com/r/SaaS/comments/1qyc62q/i_built_a_beamer_alternative_because_paying (~2025)
- https://www.reddit.com/r/SideProject/comments/1gutgx1/i_created_a_free_version_of_testimonialsenja (2024-11)
- https://www.reddit.com/r/buildinpublic/comments/1xakwek/built_my_saas_got_0_customers_in_30_days_starting (2026)
- https://www.reddit.com/r/Wordpress/comments/1oo5ry4/getting_spammed_like_crazy_on_forms (~2025-10)
- https://www.reddit.com/r/ProWordPress/comments/1k01k9a/im_at_my_wits_end_with_form_spam_what_pro_tricks (2025-04)
- https://apps.shopify.com/revenue-shield (checked 2026-10-24)
