plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }

android {
    namespace = "com.familyenglish.app"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.familyenglish.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }
    buildTypes {
        release { isMinifyEnabled = false; proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro") }
    }
    buildFeatures { buildConfig = true }
}

val serviceUrl = (findProperty("SERVICE_URL") as String?) ?: "https://example.com/"
android.defaultConfig.buildConfigField("String", "SERVICE_URL", "\"${serviceUrl.trimEnd('/')}/\"")

dependencies { implementation("androidx.core:core-ktx:1.15.0"); implementation("androidx.appcompat:appcompat:1.7.0"); implementation("com.google.android.material:material:1.12.0") }
