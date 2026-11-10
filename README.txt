CRYPTIC VERSE — CREATOR STUDIO V2 (LOCAL PREVIEW)

PURPOSE
Separate PC downloadable games from community-created 3D browser worlds.
PC Game Store: index.html (existing website, Supabase, unchanged data and logic)
Community Games: games.html (browser-local world catalog)
Creator Studio: creator.html (block-world editor, Explorer, Properties, templates, play testing)
Play World: play.html (read-only gameplay page with keyboard movement)

UPLOAD INTO YOUR EXISTING WEBSITE GITHUB REPOSITORY, NOT YOUR LAUNCHER REPOSITORY:
creator.html
creator.js
creator.css
games.html
games.js
community.css
play.html
play.js
assets/ (five .webp seasonal images)

Optional index.html: This included index.html is based on the previously uploaded site snapshot and adds two top-navigation links: Community Games and Creator Studio. DO NOT replace an index.html that has been updated since that snapshot. Instead, add these two links to your present website navigation:
<a href="games.html">Community Games</a>
<a href="creator.html">Creator Studio</a>

DEPLOY
Commit files to the website GitHub repository. Let Cloudflare redeploy.
Visit https://YOUR-WEBSITE/games.html for the community section.
Visit https://YOUR-WEBSITE/creator.html for the creator.
Create a world, click Add to My Community Games, open Community Games, then Play World.

IMPORTANT LIMITATIONS
- This is NOT Roblox Studio or a public Roblox equivalent.
- The world catalog is saved in localStorage on ONE browser and ONE origin. It is not visible to other players, devices, or browsers.
- Cloud accounts, public publishing, moderation, multiplayer, scripting, avatars, monetization, and advanced models are NOT implemented.
- Don't use the game catalog for real user content until Supabase authentication, ownership checks, data validation, RLS and moderation are added.
- All 3D scenes load Three.js from jsDelivr; network access is needed.
- This package is for the WEBSITE, not the Electron Windows launcher.
- Existing PC game database and app.js are not modified.
