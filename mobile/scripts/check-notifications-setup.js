const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const appJsonPath = path.join(root, "app.json");
const packageJsonPath = path.join(root, "package.json");

function fail(message) {
  console.error(`[FAIL] ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`[OK] ${message}`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const appJson = readJson(appJsonPath);
const packageJson = readJson(packageJsonPath);
const expo = appJson.expo ?? {};
const androidPackage = expo.android?.package;
const googleServicesFile = expo.android?.googleServicesFile;
const plugins = expo.plugins ?? [];
const dependencies = packageJson.dependencies ?? {};

if (dependencies["expo-notifications"]) {
  pass(`expo-notifications installed (${dependencies["expo-notifications"]})`);
} else {
  fail("expo-notifications is missing from mobile/package.json");
}

if (dependencies["expo-constants"]) {
  pass(`expo-constants installed (${dependencies["expo-constants"]})`);
} else {
  fail("expo-constants is missing from mobile/package.json");
}

if (dependencies["expo-dev-client"]) {
  pass(`expo-dev-client installed (${dependencies["expo-dev-client"]})`);
} else {
  fail("expo-dev-client is missing from mobile/package.json");
}

const hasNotificationsPlugin = plugins.some((plugin) => {
  if (plugin === "expo-notifications") return true;
  return Array.isArray(plugin) && plugin[0] === "expo-notifications";
});

if (hasNotificationsPlugin) {
  pass("expo-notifications plugin declared in app.json");
} else {
  fail("expo-notifications plugin is missing from mobile/app.json");
}

if (expo.extra?.eas?.projectId) {
  pass("EAS projectId present in app.json");
} else {
  fail("extra.eas.projectId is missing from mobile/app.json");
}

if (androidPackage) {
  pass(`Android package is ${androidPackage}`);
} else {
  fail("android.package is missing from mobile/app.json");
}

if (!googleServicesFile) {
  fail("android.googleServicesFile is missing from mobile/app.json");
} else {
  const googleServicesPath = path.resolve(root, googleServicesFile);

  if (!fs.existsSync(googleServicesPath)) {
    fail(`Firebase Android config is missing: ${path.relative(root, googleServicesPath)}`);
  } else {
    try {
      const googleServices = readJson(googleServicesPath);
      const projectId = googleServices.project_info?.project_id;
      const clientPackage = googleServices.client?.[0]?.client_info?.android_client_info?.package_name;
      const mobileSdkAppId = googleServices.client?.[0]?.client_info?.mobilesdk_app_id;

      if (projectId) {
        pass(`Firebase project is ${projectId}`);
      } else {
        fail("google-services.json is not a Firebase Android config: missing project_info.project_id");
      }

      if (clientPackage === androidPackage) {
        pass(`Firebase Android package matches ${androidPackage}`);
      } else {
        fail(`Firebase Android package mismatch: expected ${androidPackage}, got ${clientPackage || "missing"}`);
      }

      if (mobileSdkAppId) {
        pass("Firebase mobile SDK app id present");
      } else {
        fail("google-services.json is missing client[0].client_info.mobilesdk_app_id");
      }
    } catch (error) {
      fail(`Cannot read google-services.json: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

if (process.exitCode) {
  console.error("\nFix the items above before rebuilding the Android development APK.");
} else {
  console.log("\nNotifications setup looks ready for an Android development build.");
}
