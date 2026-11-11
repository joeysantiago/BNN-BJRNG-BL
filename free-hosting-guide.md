# Free hosting for thakurg.com: a beginner's step-by-step guide

This guide puts the whole app online without a monthly bill:

| Part | Where it runs | Cost |
|---|---|---|
| Website (the Angular build) | **GitHub Pages** | Free (public repository) |
| Domain `thakurg.com` | Your domain registrar, DNS on **Cloudflare** | You already pay for the domain each year; Cloudflare's plan is free |
| `/api` on your own domain | **Cloudflare Worker** (forwards to Azure) | Free (100,000 requests a day) |
| API (.NET 10) | **Azure App Service, F1 Free** | Free |
| Database | **Azure SQL Database, free offer** | Free (monthly allowance, then it pauses until next month) |

> **Note:** Free limits change over time. Before you create anything, check the numbers on the provider's own page. Every setting that keeps your bill at ₹0 is marked **💰 Keep it free**.

---

## 0. What you will end up with

```
                         ┌───────────────── GitHub Pages ─────────────────┐
 Visitor ──► thakurg.com ──► Cloudflare ──►│ website files (HTML, JS, CSS)              │
                  │                        └────────────────────────────────────────────┘
                  │ /api/...
                  └──► Cloudflare Worker ──► thakurg-api.azurewebsites.net ──► Azure SQL (thakurg-live)

 Tester ──► qa.thakurg.com ──► same idea ──► thakurg-api-qa.azurewebsites.net ──► Azure SQL (thakurg-qa)
```

| Environment | Website | API | Database | Built from branch |
|---|---|---|---|---|
| **Production** (final) | `https://thakurg.com` | `https://thakurg.com/api`, forwarded to `thakurg-api.azurewebsites.net` | `thakurg-live` | `banni-linux` |
| **QA** (testing) | `https://qa.thakurg.com` | `https://qa.thakurg.com/api`, forwarded to `thakurg-api-qa.azurewebsites.net` | `thakurg-qa` | `qa` (a new branch) |

The visitor's **browser** calls the API. GitHub only stores the website files and never calls the API itself.

### Why `qa.thakurg.com` and not `thakurg.com/QA`

You asked for `thakurg.com/QA`. It can be done, but it causes three problems, and a subdomain costs nothing extra:

1. **The two sites would share saved data.** QA and production on the same domain share the browser's storage and cookies. A test login on QA can overwrite your real login on production in the same browser.
2. **QA logins would get mixed up with production.** The API keeps your login in cookies scoped to `/api`. Under `/QA/api` the cookies don't match, so QA logins misbehave.
3. **The app would need code changes.** It assumes it lives at `/`: install links `/apps/khata/`, the service worker, canonical links and the sitemap. Moving it under `/QA/` would need extra code.

The rest of this guide uses **`qa.thakurg.com`**. If you still want `/QA`, see [Appendix B](#appendix-b-if-you-still-want-thakurgcomqa).

### Why the Cloudflare Worker is needed

- **Safari blocks the login cookie.** The API keeps the login in cookies. If the site is `thakurg.com` and the API is `thakurg-api.azurewebsites.net`, those are third-party cookies. **Safari, iPhone and iPad block them, so login fails.**
- **The free API can't use your domain.** The F1 Free tier of Azure App Service can't take a custom domain like `api.thakurg.com`.
- **The Worker solves both.** A free Cloudflare Worker answers at `thakurg.com/api/...` and passes each call to Azure. The browser sees one site, so cookies work everywhere and no CORS setup is needed.
- **No code change for production.** Your `live` build already calls `https://thakurg.com/api`.

---

## 1. Before you start: a checklist

- [ ] You own `thakurg.com` and can sign in at its registrar (GoDaddy, Hostinger, Namecheap, …).
- [ ] A **GitHub** account. The code repository is `BNN-BJRNG-BL`.
- [ ] A **Microsoft Azure** account. Sign-up asks for a debit or credit card **only to check your identity**. Free services stay free.
- [ ] A **Cloudflare** account (free plan).
- [ ] On your PC: **.NET 10 SDK**, **Node 22**, **Git**.
- [ ] No passwords or keys in the repository. The `appsettings*.json` files only hold placeholders such as `<password>`; keep it that way. Real values go into Azure settings (step 4.4).

> ⚠️ **`thakurg.com` already shows the Mojito demo.** The `Mojito` branch's GitHub Pages site uses that domain. A domain can belong to **one** GitHub Pages site only. Before step 6, decide where Mojito goes:
> - **Option 1:** move Mojito to `demo.thakurg.com` and set its custom domain the same way.
> - **Option 2:** remove Mojito's custom domain, so it lives at `<your-github-name>.github.io/BNN-BJRNG-BL/`.

---

## 2. The money safety net (do this first)

1. Open **Azure Portal → Cost Management → Budgets → Add**.
2. Create a budget of **₹100 a month**, with e-mail alerts at 50% and 100%.
3. **💰 Keep it free:** whenever Azure shows a choice of plan or size, pick **Free / F1** or the **free offer**. If a page shows a price above ₹0 a month, stop and check again.

If anything ever starts to cost money, you will get an e-mail long before it is much.

---

## 3. Database: Azure SQL (free offer)

Do this twice: once for QA (`thakurg-qa`), once for production (`thakurg-live`).

### 3.1 Create the database

1. **Azure Portal → SQL databases → Create.**
2. At the top, click **"Apply offer"** on the banner *"Want to try Azure SQL Database for free?"*.
3. **Resource group:** create `thakurg-rg`, and use it for everything in this guide.
4. **Database name:** `thakurg-qa` the first time, `thakurg-live` the second.
5. **Server:** **Create new**:
   - Server name: for example `thakurg-sql`, which becomes `thakurg-sql.database.windows.net`. Create it once; both databases use it.
   - Location: **Central India** (or the region nearest your users).
   - Authentication: **Use SQL authentication**. Pick an admin login and a strong password, and **save them in a password manager**.
6. **💰 Keep it free:** under *"Behavior when free limit reached"* choose **"Auto-pause the database until next month"**. Never choose *"Continue using database for additional charges"*.
7. **Networking:**
   - Connectivity method: **Public endpoint**.
   - **Allow Azure services and resources to access this server:** **Yes**. This lets the API reach the database.
   - **Add current client IP address:** **Yes**. This lets your PC run the database scripts.
8. **Review + create → Create.**

The free offer gives each database a monthly allowance of compute time and storage, and you can have up to 10 free databases. It is a **serverless** database: after about an hour with no use it **sleeps**, and the first call afterwards waits up to a minute while it wakes. Your app already allows for this: the `qa` and `live` builds wait up to 120 seconds for login calls.

### 3.2 Get the connection string

**Database → Settings → Connection strings → ADO.NET (SQL authentication).** Copy it and put your password in place of `{your_password}`. It looks like this:

```
Server=tcp:thakurg-sql.database.windows.net,1433;Initial Catalog=thakurg-qa;User ID=<admin>;Password=<password>;Encrypt=True;TrustServerCertificate=False;Connection Timeout=60;
```

> **Note:** Never commit this string to Git. You will paste it into Azure (step 4.4) and type it in a terminal (step 3.3).

### 3.3 Create the tables and the starting data (from your PC)

The `DatabaseInitializer` project runs every CREATE and INSERT script. Open a terminal in the repository folder of the branch you are deploying, then run:

**PowerShell (QA):**
```powershell
$env:DOTNET_ENVIRONMENT = "QA"
$env:ConnectionStrings__AzureSQLConnection = "<the connection string of thakurg-qa>"
dotnet run --project App-Database/DatabaseInitializer -- --Apps=All
```

**PowerShell (production):** use `"Live"` and the connection string of `thakurg-live`.

- `--Apps=All` answers "yes" for every app: Common, Music, SnapKhata and the rest.
- If you see *"Cannot open server … client IP address"*, add your current IP under **SQL server → Networking → Firewall rules**. Your home IP can change.
- Your database is **recreated from the scripts** until you go to production for real (rule: `sql-fresh-database.md`). **Once real users are on production, never re-run it there.** It would wipe their data.

---

## 4. API: Azure App Service (F1 Free)

Do this twice: `thakurg-api-qa` (environment `QA`) and `thakurg-api` (environment `Live`).

### 4.1 Create the App Service

1. **Azure Portal → App Services → Create → Web App.**
2. **Resource group:** `thakurg-rg`.
3. **Name:** `thakurg-api-qa` the first time, `thakurg-api` the second. This gives you `https://thakurg-api-qa.azurewebsites.net`.
4. **Publish:** Code. **Runtime stack:** **.NET 10 (LTS)**. **Operating system:** Windows.
   - If .NET 10 is not in the list, see the box in step 5.2.
5. **Region:** the same as the database.
6. **Pricing plan:** **Create new** → **💰 Keep it free: choose "Free F1"**. Click *"Explore pricing plans"* if F1 isn't shown.
7. **Review + create → Create.**

F1 Free limits to know:
- 60 CPU minutes a day. If that runs out, the API stops until the next day.
- 1 GB of memory and 1 GB of disk.
- **No "Always On":** the API sleeps after about 20 idle minutes, so the first call after a quiet spell is slow.
- **No custom domain.** That's why the Worker in step 7 exists.
- 32-bit only.

> ⚠️ **Disk space for music:** with only 1 GB of disk, keep large music files out of the API on F1.

### 4.2 Turn on the settings the deploy step needs

**App Service → Settings → Configuration → General settings:**
- **SCM Basic Auth Publishing Credentials:** **On**. GitHub needs this to upload the API.
- **Platform:** 32-bit, the only option on F1.
- **HTTPS Only:** **On**.

### 4.3 Get the publish profile (GitHub uses it to deploy)

**App Service → Overview → Download publish profile.** Keep the file safe. You'll paste its whole text into GitHub in step 5.1, then delete it from your PC.

### 4.4 App settings: where the real passwords live

**App Service → Settings → Environment variables.** Every name below overrides the same setting in `appsettings.json`. A `__` (two underscores) means one level deeper in that file.

| Tab | Name | Value (QA) | Value (Live) |
|---|---|---|---|
| App settings | `ASPNETCORE_ENVIRONMENT` | `QA` | `Live` |
| Connection strings | `AzureSQLConnection` (type **SQLAzure**) | the `thakurg-qa` string | the `thakurg-live` string |
| App settings | `Site__PublicUrl` | `https://qa.thakurg.com` | `https://thakurg.com` |
| App settings | `Cors__AllowedOrigins__0` | `https://qa.thakurg.com` | `https://thakurg.com` |
| App settings | `Proxy__Enabled` | `true` | `true` |

Also add your **mail (SMTP) password**, **WhatsApp or SMS keys** and the **sign-in signing key** here as app settings, using the same names the `appsettings.json` sections use. Never put them in Git.

> **Note: e-mail costs.** Sign-up and one-time codes send e-mail. Free choices:
> - Brevo: about 300 e-mails a day.
> - A Gmail account with an *App password*: personal use, limited.
>
> SMS and WhatsApp messages are almost never free, so keep sign-up on **e-mail** (Settings › General).

**Save.** The app restarts.

### 4.5 Check it

Open `https://thakurg-api-qa.azurewebsites.net/api/translations/en` in a browser. You should get JSON after up to a minute, because the database is waking up. If you see an error page, open **App Service → Log stream** while you reload.

---

## 5. Deploy the API automatically from GitHub

### 5.1 Save the publish profile in GitHub

**GitHub → repository `BNN-BJRNG-BL` → Settings → Secrets and variables → Actions → New repository secret:**
- `AZURE_API_QA_PUBLISH_PROFILE`: the whole text of the QA publish profile.
- `AZURE_API_LIVE_PUBLISH_PROFILE`: the whole text of the Live one.

### 5.2 The workflow file

Create `.github/workflows/api.yml` on **both** the `qa` and `banni-linux` branches. A push to `qa` deploys the QA API; a push to `banni-linux` deploys the live API.

```yaml
name: API
on:
  push:
    branches: [qa, banni-linux]
    paths: ['App-WebAPI/**']
  workflow_dispatch:

jobs:
  deploy:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '10.0.x'
      - name: Publish
        run: dotnet publish App-WebAPI/Thakurg/Thakurg.API/Thakurg.API.csproj -c Release -o publish
      - name: Deploy to Azure
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ github.ref_name == 'banni-linux' && 'thakurg-api' || 'thakurg-api-qa' }}
          publish-profile: ${{ github.ref_name == 'banni-linux' && secrets.AZURE_API_LIVE_PUBLISH_PROFILE || secrets.AZURE_API_QA_PUBLISH_PROFILE }}
          package: publish
```

> **If .NET 10 is not offered on F1:** publish the runtime together with the app. Change the Publish line to:
> `dotnet publish … -c Release -o publish --self-contained true -r win-x86`
> `win-x86` matches F1's 32-bit platform. The upload is bigger, but it runs without a .NET 10 runtime on the server.

Push the file. Then watch **GitHub → Actions**: the run should turn green.

---

## 6. Website: GitHub Pages

> **Note: public or private?** GitHub Pages is free only for **public** repositories; private ones need a paid plan. To keep the source code private, this guide publishes **only the built website files** to two small **public** repositories. The website files are public anyway, because every visitor downloads them.

### 6.1 Create two public repositories (empty)

- `thakurg-site`: production, which will serve `thakurg.com`.
- `thakurg-qa-site`: QA, which will serve `qa.thakurg.com`.

In each: **Settings → Pages → Build and deployment → Source: "Deploy from a branch" → Branch `gh-pages` / `(root)`.** That branch appears after the first deploy in step 6.3.

### 6.2 A token that lets the code repository push to them

1. **GitHub → your profile → Settings → Developer settings → Fine-grained tokens → Generate new token.**
2. **Repository access:** only `thakurg-site` and `thakurg-qa-site`.
3. **Permissions:** Contents → **Read and write**.
4. Copy the token. In `BNN-BJRNG-BL` → **Secrets → Actions**, add it as `SITE_DEPLOY_TOKEN`.
5. Set a calendar reminder: tokens expire, and you will need to make a new one.

### 6.3 The website workflow

Create `.github/workflows/site.yml` on both the `qa` and `banni-linux` branches:

```yaml
name: Website
on:
  push:
    branches: [qa, banni-linux]
    paths: ['App-WebUI/**']
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: App-WebUI
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: App-WebUI/package-lock.json
      - run: npm ci
      - name: Build
        run: npm run ${{ github.ref_name == 'banni-linux' && 'build:live' || 'build:qa' }}
      - name: Publish
        uses: peaceiris/actions-gh-pages@v4
        with:
          personal_token: ${{ secrets.SITE_DEPLOY_TOKEN }}
          external_repository: ${{ github.repository_owner }}/${{ github.ref_name == 'banni-linux' && 'thakurg-site' || 'thakurg-qa-site' }}
          publish_branch: gh-pages
          publish_dir: App-WebUI/dist/thakurg/browser
          cname: ${{ github.ref_name == 'banni-linux' && 'thakurg.com' || 'qa.thakurg.com' }}
```

`npm run build:live` and `npm run build:qa` already exist in `package.json`. They pick `environment.live.ts` or `environment.qa.ts`, and the post-build step writes `404.html`, `robots.txt` and `sitemap.xml`.

### 6.4 Code changes needed for QA

Two QA settings in the repository still point at the old QA plan (Azure Static Web Apps). Before the first QA deploy, change them:

| File | Setting | Change to |
|---|---|---|
| `App-WebUI/src/environments/environment.qa.ts` | `apiBaseUrl` | `https://qa.thakurg.com/api` |
| `App-WebAPI/Thakurg/Thakurg.API/appsettings.QA.json` | `Site.PublicUrl` and `Cors.AllowedOrigins` | `https://qa.thakurg.com` |

The QA site must **not** be found by Google:
- In the QA build, `robots.txt` should say `Disallow: /`.
- QA pages should carry `<meta name="robots" content="noindex">`.

Production keeps everything open (rule §8). Both are small changes in `scripts/postbuild.mjs` and the SEO service; Claude can make them on request.

---

## 7. Domain and Cloudflare (DNS, HTTPS and the `/api` Worker)

### 7.1 Move the domain's DNS to Cloudflare (free)

1. **Cloudflare → Add a site → `thakurg.com` → Free plan.**
2. Cloudflare shows **two nameservers**. At your registrar, replace the domain's nameservers with those two.
3. Wait until Cloudflare says **Active**. It usually takes minutes, sometimes up to 24 hours.

### 7.2 DNS records for GitHub Pages

**Cloudflare → DNS → Records.** Add the following, all with **Proxy status: DNS only (grey cloud)** for now:

| Type | Name | Content |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `<your-github-name>.github.io` |
| CNAME | `qa` | `<your-github-name>.github.io` |

(These are GitHub's published Pages addresses. Compare them with GitHub's "Managing a custom domain" page.)

### 7.3 Turn on HTTPS in GitHub

1. **GitHub → your profile → Settings → Pages → Add a verified domain → `thakurg.com`.** Add the TXT record it shows in Cloudflare, then click Verify. This stops anyone else from claiming your domain.
2. In `thakurg-site` → **Settings → Pages**:
   - **Custom domain:** `thakurg.com`.
   - Wait for the green *"DNS check successful"*.
   - Then tick **Enforce HTTPS**. The certificate can take up to an hour.
3. Do the same in `thakurg-qa-site` with `qa.thakurg.com`.

### 7.4 Switch on Cloudflare's proxy

Only after both sites open with HTTPS:
1. Change the records `@`, `www` and `qa` to **Proxied (orange cloud)**. Workers only run on proxied records.
2. **Cloudflare → SSL/TLS → Overview → Full.** Never choose "Flexible".

### 7.5 The `/api` Worker

1. **Cloudflare → Workers & Pages → Create → Worker.** Name it `thakurg-api-proxy`, then **Deploy**.
2. **Edit code**, replace everything with the code below, then **Deploy**:

```js
// Forwards https://thakurg.com/api/... and https://qa.thakurg.com/api/... to the matching Azure API.
// The browser only ever sees thakurg.com, so login cookies stay first-party (Safari works) and no CORS is needed.
const TARGETS = {
  'thakurg.com': 'https://thakurg-api.azurewebsites.net',
  'www.thakurg.com': 'https://thakurg-api.azurewebsites.net',
  'qa.thakurg.com': 'https://thakurg-api-qa.azurewebsites.net',
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = TARGETS[url.hostname];
    if (!target)
      return new Response('Not found', { status: 404 });
    const headers = new Headers(request.headers);
    headers.set('X-Forwarded-Host', url.hostname);
    headers.set('X-Forwarded-Proto', 'https');
    headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') ?? '');
    return fetch(target + url.pathname + url.search, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
    });
  },
};
```

3. **Worker → Settings → Domains & Routes → Add → Route**, three times:
   - `thakurg.com/api/*`
   - `www.thakurg.com/api/*`
   - `qa.thakurg.com/api/*`

   Choose zone `thakurg.com` each time.

`X-Forwarded-For` passes the visitor's real IP to the API. The API reads it when `Proxy__Enabled` is `true` (step 4.4); limits such as "codes per IP" use it.

---

## 8. First full deploy, in order

1. **Database:**
   - Create both databases (step 3).
   - Run the scripts against `thakurg-qa` (step 3.3).
2. **API:**
   - Create both App Services (step 4).
   - Fill in the settings (step 4.4).
   - Add the GitHub secrets (step 5.1).
3. **Repositories and DNS:**
   - Create `thakurg-site` and `thakurg-qa-site` (step 6.1) and the token (step 6.2).
   - Set up Cloudflare and DNS (steps 7.1–7.3).
4. **QA branch:**
   - Create the `qa` branch from `banni-linux`.
   - Make the QA changes (step 6.4).
   - Add both workflow files.
   - Push.
5. **Test QA:**
   - `https://qa.thakurg.com` opens.
   - Log in: the first time may wait a minute while the database wakes.
   - Change a setting and check that it is saved.
6. **Proxy and Worker:** turn on the proxy and the Worker (steps 7.4–7.5), then test login again, also on an iPhone if you can.
7. **Production:**
   - Run the scripts against `thakurg-live` (step 3.3).
   - Add the workflow files to `banni-linux` and push.
   - Check `https://thakurg.com`.
8. **Google:** submit `https://thakurg.com/sitemap.xml` in **Google Search Console**. Only the production site, never QA.

### Day-to-day release flow

```
Features/App/*  ──merge──►  qa  ──(test on qa.thakurg.com)──►  banni-linux  ──►  thakurg.com
                            push = QA deploy                     push = production deploy
```

---

## 9. Troubleshooting

| What you see | Likely cause | What to do |
|---|---|---|
| The first page load or login takes about a minute | The database or the F1 API was asleep | Normal on free plans; the next calls are fast |
| API returns **403 "Site Disabled"** | F1's 60 CPU minutes for the day are used up | It comes back the next day |
| Database error after many weeks | The month's free allowance is used, so it is paused until next month | Expected with "auto-pause"; it costs nothing |
| Login works on PC Chrome but not on iPhone | The site is calling `…azurewebsites.net` directly | Check that the Worker routes exist (7.5) and that `apiBaseUrl` is `https://<site>/api` |
| GitHub says "Domain is improperly configured" | The DNS records are wrong, or the proxy was turned on too early | Set the records to grey cloud (7.2), wait for HTTPS, then turn the proxy on (7.4) |
| The installed phone app shows an old version | The app keeps an offline copy | Close the app fully and reopen it, once or twice |
| `npm ci` fails in Actions | `package-lock.json` doesn't match `package.json` | Run `npm install` locally, commit `package-lock.json` |

---

## Appendix A: what is still not free

- **The domain name:** yearly renewal at your registrar.
- **SMS and WhatsApp messages:** charged by the provider per message.
- **Going past the free limits:** with the settings above, the database pauses and the F1 API stops for the day instead of billing you. **Never upgrade** a plan by clicking "Scale up" unless you mean to pay.

## Appendix B: if you still want `thakurg.com/QA`

This is possible, with the problems listed in section 0:
- Build QA with `ng build --configuration qa --base-href /QA/`, and publish it into a `QA` folder of `thakurg-site`. Use `destination_dir: QA` and `keep_files: true` in the Publish step.
- Fix every absolute path in the app (`/apps/<code>/`, manifests, canonical links).
- Add a Worker route `thakurg.com/QA/api/*` that strips `/QA` before forwarding.
- Add `Disallow: /QA/` to production's `robots.txt`.
- Test QA only in a **private window or a separate browser profile**, so its logins don't overwrite production's.
