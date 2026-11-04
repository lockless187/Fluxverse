FLUXVERSE WEBSITE FILES

FILES
- index.html
- styles.css
- app.js

STEP A — CONNECT SUPABASE
1. Open app.js in a text editor.
2. At the very top, replace PASTE_PROJECT_URL_HERE with your Supabase Project URL.
3. Replace PASTE_PUBLISHABLE_KEY_HERE with your Supabase Publishable key.
4. Keep the quotation marks around both values.
5. Save app.js.

Only use the Project URL and Publishable key (also sometimes called anon public key). Never use a service_role key, secret key, or database password in website code.

STEP B — UPLOAD TO GITHUB
Upload index.html, styles.css, and app.js to the ROOT of your fluxverse repository. README.txt is optional.
Do not upload your private FluxVerse-Details.txt file.

STEP C — CLOUDFLARE PAGES
In Cloudflare: Workers & Pages > Create > Pages > Connect to Git.
Choose your GitHub account and fluxverse repository.
Framework preset: None.
Build command: leave blank.
Build output directory: / (if it rejects this, use .).
Deploy.

After deployment, add the Cloudflare website address to Supabase Authentication > URL Configuration as the Site URL and an allowed Redirect URL.

FEATURE NOTES
This starter connects Supabase auth, profile display, sample game catalog, library, wishlist, community posts, username search, and friend requests.
It does not include checkout or real paid purchases. The displayed prices are catalog labels only. Do not take payments until a secure payment system and server-side purchase verification are added.
