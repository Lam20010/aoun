# عون — تطبيق الجوال

Same design and live agents as the web prototype (`/app` on the server), full screen on the phone.

## Try it on an iPhone (no Mac needed)

1. Install **Expo Go** from the App Store on the iPhone.
2. On a computer with Node.js 20+:
   ```
   cd mobile
   npm install
   npx expo start --tunnel
   ```
3. Scan the QR code with the iPhone camera. It opens in Expo Go. Allow the microphone.

## A real installable app

- Android APK: `npx eas-cli build -p android --profile preview` (free Expo account).
- iPhone (TestFlight): `npx eas-cli build -p ios` then `npx eas-cli submit -p ios` (needs an Apple Developer account; no Mac needed, Expo builds in the cloud).
