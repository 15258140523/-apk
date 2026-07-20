# Android shell

This native shell opens the HTTPS URL of the deployed Family English App in a hardened WebView. It keeps app navigation inside the configured host and opens all other links in the system browser.

## Configure and build locally

1. Set `SERVICE_URL` in `app/build.gradle.kts` to the final HTTPS URL, including the trailing `/`.
2. Run `gradle --no-daemon :app:assembleDebug` with Android Studio's Gradle installation, or use the repository workflow.
3. Sign the generated release APK with your Android signing key before distributing it.

The repository workflow builds an installable debug APK. Configure the repository variable `SERVICE_URL` before running it. For store distribution, add a signing configuration and build a signed release APK.
