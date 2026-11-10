CRYPTIC VERSE CREATOR — v1 BROWSER WORLD EDITOR
==============================================

What you get
------------
- creator.html — separate 3D Creator Studio page
- creator.js / creator.css — working world editor
- assets/ — the five seasonal background images
- index.html — your uploaded Cryptic Verse homepage with a NEW Create button
- app.js and styles.css — copies of your uploaded website files, unchanged

INSTALL IN GITHUB (WEBSITE REPOSITORY — NOT WINDOWS LAUNCHER)
-----------------------------------------------------------
1. Back up your existing website repository first.
2. Upload creator.html, creator.js, creator.css and the assets folder
   to the SAME repository and directory as your live index.html.
3. To add the Create button, you may replace index.html with the included
   edited index.html ONLY IF your live homepage is still the same version
   as the index.html you previously provided. If your site has changed,
   do NOT overwrite your newer index.html; instead add this link inside
   the top navigation in your current index.html:

   <a href="creator.html" class="cv-create-entry">✦ Create</a>

   You can also simply open https://YOUR-SITE/creator.html
   without changing the home page at all.
4. Do NOT replace your working Supabase database or apply any SQL yet.
5. In Cloudflare, deploy the site normally. Open creator.html on HTTPS.
6. 3D requires internet access to load a fixed Three.js library from
   jsDelivr. Browser must support WebGL and ES modules.

FEATURES
--------
- Place, select, paint by choosing material, delete, rotate and raise blocks
- Snap-to-grid building, 500-block limit, undo, goal flag
- 3D orbit camera and basic playable WASD / Space test mode
- Draft save in browser localStorage, JSON export/import
- Automatic seasonal backgrounds in Studio (spring/summer/autumn/winter/
  Christmas Dec 24-25) using your existing seasonal art

NOT YET INCLUDED
----------------
- Cloud publishing, other players discovering worlds, multiplayer,
  scripting, accounts/cloud saves or game moderation
- Real physics engine, complex terrain or game monetization

IMPORTANT
---------
Browser localStorage is tied to the browser and device and can be cleared.
Export world .json backups regularly. Imports are capped and validated.
Do not run arbitrary player-supplied JavaScript. Cloud publishing requires
private drafts, per-user authorization, storage quotas, moderation and
server-side validation before going live.
