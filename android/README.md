# BuzzPatrika Android app

The Android app is a Trusted Web Activity (TWA): a small native wrapper that opens buzzpatrika.com full-screen. It updates automatically whenever the website changes, so you only publish a new app version when the app itself (name, icon, colours) changes.

- Package name: `com.buzzpatrika.app`
- Project generated with [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) from `twa-manifest.json`
- Built for free by GitHub Actions (`.github/workflows/build-android.yml`)

## One-time setup

1. **Add the signing key to GitHub.** Repository → Settings → Secrets and variables → Actions → New repository secret:
   - `ANDROID_KEYSTORE_BASE64`: the base64 text from your private signing notes
   - `ANDROID_KEYSTORE_PASSWORD`: the password from the same notes

   Keep the `.keystore` file and password somewhere safe (for example a password manager). Never commit them. Without the key you cannot publish updates to the same Play Store listing.
2. **Build.** Actions → Build Android app → Run workflow. When it finishes, download the `buzzpatrika-android` artifact. It contains:
   - `buzzpatrika.apk`: install on a phone to test
   - `buzzpatrika.aab`: upload to the Play Store
3. **Publish.** Create a Google Play developer account (one-time $25 fee), create an app, and upload `buzzpatrika.aab`. Play needs a privacy policy URL, screenshots, the 512×512 icon (`store_icon.png`) and a short description.
4. **Remove the address bar.** In Play Console → Setup → App signing, copy the **App signing key certificate SHA-256 fingerprint** and add it to `News Media Website Design/public/.well-known/assetlinks.json` next to the existing upload-key fingerprint. Deploy the site. Until this is done the app shows a thin browser bar at the top.

## Releasing an update

Increase `appVersionCode` (and `appVersionName`) in `twa-manifest.json` and in `app/build.gradle`, push to `main`, then upload the new `.aab`.
