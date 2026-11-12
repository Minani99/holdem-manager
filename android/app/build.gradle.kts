plugins {
    id("com.android.application")
}

// 업로드 키는 저장소에 넣지 않고 환경변수로만 받아요 (GitHub Actions secrets → env).
val uploadKeystore: String? = System.getenv("HOLDEM_KEYSTORE")?.takeIf { it.isNotBlank() }

android {
    namespace = "com.minani99.holdemmanager"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.minani99.holdemmanager"
        minSdk = 26
        targetSdk = 36
        // 플레이스토어에 올릴 때마다 커져야 해요. CI에서는 실행 번호를 써요.
        versionCode = System.getenv("HOLDEM_VERSION_CODE")?.toIntOrNull() ?: 1
        versionName = "1.0.0"
    }

    signingConfigs {
        if (uploadKeystore != null) {
            create("upload") {
                storeFile = file(uploadKeystore)
                storePassword = System.getenv("HOLDEM_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("HOLDEM_KEY_ALIAS")
                keyPassword = System.getenv("HOLDEM_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (uploadKeystore != null) signingConfig = signingConfigs.getByName("upload")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
