# PAISA — Environment Configuration & Development Setup
**Document ID:** `docs/PAISA_ENVIRONMENT_SETUP.md`  
**Execution Stage:** Stage Three — Infrastructure & Environment Setup  
**Author:** Software Architecture, Database & Security Engineering Team  
**Date:** October 31, 2026  
**Status:** COMPLETE & VERIFIED  

---

## 1. Environment Architecture Overview

PAISA supports three runtime target environments:
1. **Production Web (Vercel)**: Global Edge CDN with automated SPA rewrites (`paisa-orpin.vercel.app`).
2. **Native Mobile (Android APK)**: Packaged via Capacitor 8, compiled with Android Gradle Plugin 8.13 and Java 21 Temurin.
3. **Local Development (Vite + Node 22)**: Fast ESM development server on port 5173.

---

## 2. Environment Variables Specification

All sensitive credentials must follow strict zero-trust placement rules:
- **Client-Accessible (VITE_ prefix)**: Bundled into the frontend. Must ONLY include public identifiers (Supabase Project URL and Anon Public Key).
- **Service Role Secrets (`sb_secret_...`)**: **STRICTLY PROHIBITED** in client code, git repositories, or `.env.local`. Service role keys are reserved solely for administrative backchannel tooling.

### 2.1 Configuration Matrix
| Variable Name | Environment | Type | Value / Purpose |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Local, Vercel, Android | Config (Public) | `https://hpscyhvlbisquajditpg.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Local, Vercel, Android | Public Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Local, Vercel | Public Key (Optional modern) | `sb_publishable_a-rzX20-UFvg15Bmpj6StA_LzH4S7xX` |

---

## 3. Local Development Setup (Step-by-Step)

### 3.1 Prerequisites
- Node.js `v20+` or `v22+` (Node v22.16 LTS verified)
- npm `v10+`
- Java JDK 21 (Eclipse Temurin JDK 21 required for native Android compilation)
- Android Studio / Android SDK Platform 36

### 3.2 Setup Instructions
1. **Clone repository:**
   ```bash
   git clone https://github.com/NaikAtharva002/paisa.git
   cd paisa
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure local environment (`.env.local`):**
   ```bash
   VITE_SUPABASE_URL=https://hpscyhvlbisquajditpg.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhwc2N5aHZsYmlzcXVhamRpdHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0NDgxNDgsImV4cCI6MjEwOTAyNDE0OH0.Hw1xtuaS_FzUPPMHuNyjIq5OZfuJQSNb4KQkVXwtNsk
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_a-rzX20-UFvg15Bmpj6StA_LzH4S7xX
   ```
4. **Run unit & integration test suites:**
   ```bash
   npm test
   ```
5. **Start local development server:**
   ```bash
   npm run dev
   ```

---

## 4. Vercel Production Deployment Setup

1. In the **Vercel Dashboard** → Select **paisa** project → **Settings** → **Environment Variables**:
   - Add `VITE_SUPABASE_URL` with value `https://hpscyhvlbisquajditpg.supabase.co`.
   - Add `VITE_SUPABASE_ANON_KEY` with your anon public JWT key.
2. In **Build & Development Settings**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
3. Verify routing rewrite in `vercel.json`:
   ```json
   {
     "rewrites": [
       { "source": "/floorplan", "destination": "/floorplan/index.html" },
       { "source": "/floorplan/(.*)", "destination": "/floorplan/$1" },
       { "source": "/(.*)", "destination": "/" }
     ]
   }
   ```

---

## 5. Native Android Build Setup (Capacitor 8)

1. Build web distribution:
   ```bash
   npm run build
   ```
2. Copy distribution assets to Android asset folder:
   ```bash
   Copy-Item -Path "dist/*" -Destination "android/app/src/main/assets/public/" -Recurse -Force
   ```
3. Verify Android SDK parameters in `android/variables.gradle`:
   - `compileSdkVersion = 36`
   - `targetSdkVersion = 35`
   - `minSdkVersion = 24`
4. Build APK via Gradle:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
