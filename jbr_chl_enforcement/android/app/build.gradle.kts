plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.jrb.chlenforcement"
    compileSdk = 37
    compileSdkMinor = 0
    ndkVersion = flutter.ndkVersion

    compileOptions {
        isCoreLibraryDesugaringEnabled = true

        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.jrb.chlenforcement"

        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        
        versionCode = flutter.versionCode
        versionName = flutter.versionName

        multiDexEnabled = true
    }

    // Each flavor names its app (resValue), which AGP 9 needs switched on.
    buildFeatures {
        resValues = true
    }

    // One app per backend, installable side by side; pick with --flavor.
    flavorDimensions += "environment"
    productFlavors {
        create("dev") {
            dimension = "environment"
            applicationIdSuffix = ".dev"
            resValue("string", "app_name", "CHL Enforcement Dev")
        }
        create("staging") {
            dimension = "environment"
            applicationIdSuffix = ".staging"
            resValue("string", "app_name", "CHL Enforcement Staging")
        }
        create("prod") {
            dimension = "environment"
            resValue("string", "app_name", "CHL Enforcement")
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

dependencies {
    coreLibraryDesugaring(
        "com.android.tools:desugar_jdk_libs:2.1.4"
    )
}