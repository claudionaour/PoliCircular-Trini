#!/usr/bin/env bash
set -euo pipefail

export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk-amd64}"
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

# Prevent recursive APK packaging inside Android assets
rm -f public/downloads/PoliCircular.apk dist/downloads/PoliCircular.apk

npm run build
npx cap sync android
rm -rf android/app/src/main/assets/public/downloads

cd android
chmod +x ./gradlew
./gradlew assembleRelease

cd ..
UNSIGNED_APK="android/app/build/outputs/apk/release/app-release-unsigned.apk"
SIGNED_APK="public/downloads/PoliCircular.apk"
KEYSTORE="android/app/policircular-release.keystore"

if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" \
    -alias policircular \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass policircular2026 \
    -keypass policircular2026 \
    -dname "CN=PoliCircular, OU=Liceo Politecnico de Castro, O=PoliCircular Chiloe, L=Castro, ST=Los Lagos, C=CL"
fi

mkdir -p public/downloads dist/downloads
"$ANDROID_HOME/build-tools/35.0.0/zipalign" -f -p 4 "$UNSIGNED_APK" /tmp/policircular-aligned.apk
"$ANDROID_HOME/build-tools/35.0.0/apksigner" sign \
  --ks "$KEYSTORE" \
  --ks-key-alias policircular \
  --ks-pass pass:policircular2026 \
  --key-pass pass:policircular2026 \
  --out "$SIGNED_APK" \
  /tmp/policircular-aligned.apk
rm -f /tmp/policircular-aligned.apk

"$ANDROID_HOME/build-tools/35.0.0/apksigner" verify "$SIGNED_APK"
cp "$SIGNED_APK" dist/downloads/PoliCircular.apk
ls -lh "$SIGNED_APK"
