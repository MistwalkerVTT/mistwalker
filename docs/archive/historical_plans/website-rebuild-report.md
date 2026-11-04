# Active Drone Solutions – Website Rebuild & Modernization Report

## Executive Summary
The entire **Active Drone Solutions** website (`www.active-drones.com`) has been successfully downloaded, backed up, and rebuilt from scratch into a modern, lightning-fast static architecture. Zero imagery, text, or documentation was lost. The site is currently running locally at `http://localhost:3000` and is completely ready for future updates and cloud hosting.

---

## 1. Asset & Media Preservation

All original assets were downloaded directly from GoDaddy's CDN and Vimeo in full uncompressed resolution:

- **117 Total Local Asset Files (62.7 MB preserved on disk)**
- **High-Resolution Imagery (`assets/images/`):**
  - Brand identity: Primary logo, icon badge, social avatars
  - Aerial sensor photography: FLIR thermal scans, LiDAR point clouds, OGI optical gas imaging, TDLAS methane detection maps, pipeline right-of-ways, railway corridors, agricultural NDVI maps
- **Video Thumbnails & Embeds (`assets/images/vimeo/`):**
  - Complete Vimeo and YouTube flight operation videos
- **Technical Documentation & Brochures (`assets/docs/`):**
  - `Active_Drone_Solutions_-_Oil_and_Gas_Solutions.pdf` (7.1 MB complete brochure)
  - `Website_Privacy_Policy.pdf` (official privacy policy)
- **Zero Third-Party Dependency:** All images and documents are linked via local relative paths, eliminating any risk of broken links if GoDaddy expires.

---

## 2. Complete Page Inventory (26 Core Pages + 14 Blog Posts)

### Core Pages (`g:/ADS/Media/Web/Website 2026 Update/`)
| Page Name | Local File | Original URL Slug |
| :--- | :--- | :--- |
| **Homepage** | [`index.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/index.html) | `/` & `/home` |
| **Oil & Gas** | [`oil-and-gas.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/oil-and-gas.html) | `/oil-%26-gas` |
| **Pipeline ROW Inspections** | [`pipeline-row-inspections.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/pipeline-row-inspections.html) | `/pipeline-row-inspections` |
| **Pipeline ROW Overview** | [`pipeline-row-inspections-1.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/pipeline-row-inspections-1.html) | `/pipeline-row-inspections-1` |
| **Leak & Methane Detection** | [`leak-detection.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/leak-detection.html) | `/leak-detection` |
| **Slope Monitoring** | [`slope-monitoring.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/slope-monitoring.html) | `/slope-monitoring` |
| **Geohazard Identification** | [`geohazard-identification.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/geohazard-identification.html) | `/geohazard-identification` |
| **Mapping & Survey** | [`mapping-and-survey.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/mapping-and-survey.html) | `/mapping-%26-survey` |
| **Topographic Mapping** | [`topographic-mapping.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/topographic-mapping.html) | `/topographic-mapping` |
| **B.V.L.O.S. Operations** | [`bvlos.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/bvlos.html) | `/b-v-l-o-s-1` |
| **Autonomous Drone-in-a-Box** | [`autonomous-drones.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/autonomous-drones.html) | `/autonomous-drones` |
| **Flare Stack Inspections** | [`flare-stack-inspections.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/flare-stack-inspections.html) | `/flare-stack-inspections` |
| **Energy & Utilities** | [`energy.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/energy.html) | `/energy` |
| **Railway Infrastructure** | [`railway.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/railway.html) | `/railway` |
| **Construction & Earthworks** | [`construction.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/construction.html) | `/construction` |
| **Precision Agriculture** | [`agriculture.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/agriculture.html) | `/agriculture` |
| **NDVI - Vegetation Health** | [`ndvi-vegetation-health.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/ndvi-vegetation-health.html) | `/ndvi-vegetation-health` |
| **Perimeter Security** | [`security.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/security.html) | `/security-1` |
| **Dynamic Custom UAVs** | [`other-drone-solutions.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/other-drone-solutions.html) | `/other-drone-solutions` |
| **Flight Operations Videos** | [`videos.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/videos.html) | `/videos` |
| **Brochure Download** | [`info-brochure.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/info-brochure.html) | `/info-brochure-1` |
| **Brand Media & Logos** | [`logo-and-images.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/logo-and-images.html) | `/logo-and-images` |
| **Blog Directory** | [`blog/index.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/blog/index.html) & [`blog.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/blog.html) | `/blog` |
| **Contact Us** | [`contact-us.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/contact-us.html) | `/contact-us` |
| **Booking Confirmation** | [`booking-complete.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/booking-complete.html) | `/booking-complete` |
| **Privacy Policy** | [`web-info-privacy-policy.html`](file:///g:/ADS/Media/Web/Website%202026%20Update/web-info-privacy-policy.html) | `/web-info-privacy-policy` |

### Blog Articles (`g:/ADS/Media/Web/Website 2026 Update/blog/`)
All 14 articles are rendered into **both** `blog/<slug>.html` and `blog/f/<slug>.html` for 100% backward compatibility:
1. `analysis-ready-data-the-shift-to-ai-driven-pipeline-monitoring.html`
2. `april-1st-methane-deadline-navigating-the-2026-mandate.html`
3. `why-methane-detection-is-shifting-from-specialists-to-uavs.html`
4. `bvlos-drone-regulations-in-canada-a-guide-to-autonomous-uav-ops.html`
5. `how-drones-are-transforming-railway-inspections.html`
6. `7-key-benefits-of-drone-in-the-box-systems-for-oil-gas.html`
7. `revolutionizing-mapping-surveying-in-alberta-with-lidar-drones.html`
8. `slope-stability-monitoring-for-oil-and-gas-projects-in-alberta.html`
9. `revolutionizing-oil-gas-inspections-with-thermal-imaging-drones.html`
10. `benefits-of-using-drones-for-pipeline-geohazard-identification.html`
11. `drones-and-lidar.html`
12. `how-drones-are-helping-to-reduce-fugitive-emissions.html`
13. `how-farmers-are-using-drones-to-increase-crop-yields.html`
14. `how-drones-can-be-used-for-pipeline-inspections.html`

---

## 3. Visual & Architecture Improvements

1. **Precision Industrial Aesthetic:**
   - Deep obsidian/charcoal backgrounds (`#0b0f17`, `#111827`) paired with clean white content sections.
   - High-contrast Active Drone emerald green accent (`#439c48` / `#22c55e`).
   - Modern typography using `Outfit`, `Montserrat`, and `Inter`.
2. **Enhanced Navigation & UX:**
   - Sticky header with direct telephone (`1-587-205-0502`), headquarters info, and 1-click consultation scheduler.
   - Categorized Mega-Menu grouping specialized drone tech and resources.
   - Full mobile-responsive drawer with touch-friendly navigation.
3. **Interactive Components:**
   - Smooth accordion for the complete FAQ section.
   - Interactive project inquiry & consultation form with immediate feedback.
   - Responsive video containers (16:9) for Vimeo and YouTube embeds.
4. **Zero Vendor Lock-in & Future Hosting Ready:**
   - Built with clean, pure static HTML5/CSS3/Vanilla JS.
   - Can be served locally or deployed to Netlify, Vercel, Firebase Hosting, Apache, Nginx, or AWS S3 with zero re-architecture needed.

---

## 4. How to View and Run Internally

The local development server is active:
- **Local URL:** `http://localhost:3000/`
- To restart the server at any time:
  ```powershell
  cd "g:\ADS\Media\Web\Website 2026 Update"
  node serve.mjs
  ```
- To regenerate or update any pages from the data files:
  ```powershell
  node scripts/build_full_site.mjs
  ```
