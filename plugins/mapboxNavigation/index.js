/* eslint-disable no-undef */
const {
  withDangerousMod,
  withPlugins,
  withInfoPlist,
  withAppBuildGradle,
  withStringsXml,
  AndroidConfig,
  withMainApplication,
  withAndroidManifest,
} = require('@expo/config-plugins');
const { resolve, dirname } = require('path');
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const { IOSConfig, withXcodeProject } = require('@expo/config-plugins');
const { getAppDelegateFilePath } = IOSConfig.Paths;
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

function withMapboxNavigationPod(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const { platformProjectRoot } = cfg.modRequest;
      const podfile = resolve(platformProjectRoot, 'Podfile');
      const contents = readFileSync(podfile, 'utf-8');

      const postInstaller =
        "  installer.pods_project.targets.each do |target| \n   target.build_configurations.each do |config| \n    config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = podfile_properties['ios.deploymentTarget'] || '13.0' \n    end \n  end";

      const postTargetPodInstaller = mergeContents({
        tag: 'target installer',
        src: contents,
        newSrc: postInstaller,
        anchor: /\s+post_install/,
        offset: 1,
        comment: '#',
      });
      if (!postTargetPodInstaller.didMerge) {
        console.error(
          "ERROR: Cannot add block to the project's ios/Podfile because it's malformed. Please report this with a copy of your project Podfile."
        );
        return config;
      }
      const addMapboxPod = mergeContents({
        tag: 'add mapbox pod',
        src: postTargetPodInstaller.contents,
        newSrc: ` pod 'MapboxNavigation', :git => 'https://github.com/Francisco-Costa98/mapbox-navigation-ios.git', :branch => 'release-v2.14', :tag => 'v2.14.0'`,
        anchor: /\s+use_expo_modules!/,
        offset: 0,
        comment: '#',
      });
      if (!addMapboxPod.didMerge) {
        console.error(
          "ERROR: Cannot add block to the project's ios/Podfile because it's malformed. Please report this with a copy of your project Podfile."
        );
        return config;
      }
      writeFileSync(podfile, addMapboxPod.contents);

      return cfg;
    },
  ]);
}

function withMapboxNavigationReactBridge(config) {
  return withXcodeProject(config, (cfg) => {
    const xcodeProject = cfg.modResults;

    // Get the Xcode project "key" that the new file entries will be added
    // to
    const { projectName, projectRoot } = cfg.modRequest;
    const group = xcodeProject.pbxGroupByName(projectName);
    const key = xcodeProject.findPBXGroupKey({
      name: group.name,
      path: group.path,
    });

    // The directory where new source files should be copied to
    const sourceDir = dirname(getAppDelegateFilePath(projectRoot));

    // A helper function to copy files into the project
    const addSourceFile = (name) => {
      // eslint-disable-next-line no-undef
      const src = resolve(__dirname, 'ios', name);
      const dst = resolve(sourceDir, name);
      writeFileSync(dst, readFileSync(src, 'utf-8'));
      // Update the Xcode project data stored in the cfg object
      xcodeProject.addSourceFile(`${projectName}/${name}`, null, key);
    };

    addSourceFile('MapboxNavigationManager.swift');
    addSourceFile('MapboxNavigationManager.m');
    return cfg;
  });
}

function withMapboxNavigationInfoPlist(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIBackgroundModes = ['location', 'audio'];
    return cfg;
  });
}

async function setCustomConfigAsync(config, androidManifest) {
  const { getMainApplicationOrThrow } = AndroidConfig.Manifest;

  // Get the <application /> tag and assert if it doesn't exist.
  const mainApplication = getMainApplicationOrThrow(androidManifest);
  const activityList = mainApplication.activity;

  const activityToAdd = {
    $: {
      'android:name': '.NavigationViewActivity',
      'android:label': '@string/app_name',
      'android:configChanges': 'keyboard|keyboardHidden|orientation|screenSize|uiMode',
      'android:windowSoftInputMode': 'adjustResize',
      'android:theme': '@style/Theme.App.SplashScreen',
      'android:exported': 'true',
      'android:screenOrientation': 'portrait',
    },
  };
  activityList.push(activityToAdd);

  return androidManifest;
}

function addManifestMods(config) {
  return withAndroidManifest(config, async (cfg) => {
    cfg.modResults = await setCustomConfigAsync(cfg, cfg.modResults);
    return cfg;
  });
}

function addLayoutFiles(resDirectory, filename, file) {
  const layoutDir = resDirectory + '/layout';
  const layoutDirExists = existsSync(layoutDir);
  if (layoutDirExists) {
    writeFileSync(layoutDir + '/' + filename, file);
  } else {
    mkdirSync(layoutDir);
    writeFileSync(layoutDir + '/' + filename, file);
  }
}

function modifyAndroidProjImport(file, importName) {
  const fileLines = file.split('\n');
  fileLines[0] = `package ${importName};`;
  return fileLines.join('\n');
}

function withAndroidBridgeFiles(config, { androidBundlePostfix }) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const androidProjRoot = cfg.modRequest.platformProjectRoot;
      const navViewActivityFileName = 'NavigationViewActivity.kt';
      const navViewActivityPackageFileName = 'NavigationViewReactPackage.java';
      const navViewActivityModuleFileName = 'RNMapboxNavigation.java';
      const navViewActivityLayoutFileName = 'mapbox_activity_navigation_view.xml';
      const androidBundleName = `com.rosamuel.${androidBundlePostfix}`;

      const activityFile = modifyAndroidProjImport(
        readFileSync(__dirname + '/android/' + navViewActivityFileName, 'utf-8'),
        androidBundleName
      );
      const packageFile = modifyAndroidProjImport(
        readFileSync(__dirname + '/android/' + navViewActivityPackageFileName, 'utf-8'),
        androidBundleName
      );
      const moduleFile = modifyAndroidProjImport(
        readFileSync(__dirname + '/android/' + navViewActivityModuleFileName, 'utf-8'),
        androidBundleName
      );
      const layoutFile = readFileSync(__dirname + '/android/' + navViewActivityLayoutFileName);

      writeFileSync(
        androidProjRoot + `/app/src/main/java/com/rosamuel/${androidBundlePostfix}/` + navViewActivityFileName,
        activityFile
      );
      writeFileSync(
        androidProjRoot + `/app/src/main/java/com/rosamuel/${androidBundlePostfix}/` + navViewActivityPackageFileName,
        packageFile
      );
      writeFileSync(
        androidProjRoot + `/app/src/main/java/com/rosamuel/${androidBundlePostfix}/` + navViewActivityModuleFileName,
        moduleFile
      );
      addLayoutFiles(androidProjRoot + '/app/src/main/res', navViewActivityLayoutFileName, layoutFile);

      return cfg;
    },
  ]);
}

function withAndroidViewBridgeFiles(config, { androidBundlePostfix }) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const androidProjRoot = cfg.modRequest.platformProjectRoot;
      const navViewFileName = 'NavigationView.kt';
      const navViewManagerName = 'NavigationViewManager.kt';
      const androidBundleName = `com.rosamuel.${androidBundlePostfix}`;
      const navViewActivityPackageFileName = 'NavigationViewReactPackage.java';
      const navViewActivityLayoutFileName = 'mapbox_activity_navigation_view.xml';

      const viewFile = modifyAndroidProjImport(
        readFileSync(__dirname + '/androidView/' + navViewFileName, 'utf-8'),
        androidBundleName
      );
      const managerFile = modifyAndroidProjImport(
        readFileSync(__dirname + '/androidView/' + navViewManagerName, 'utf-8'),
        androidBundleName
      );
      const packageFile = modifyAndroidProjImport(
        readFileSync(__dirname + '/androidView/' + navViewActivityPackageFileName, 'utf-8'),
        androidBundleName
      );
      const layoutFile = readFileSync(__dirname + '/androidView/' + navViewActivityLayoutFileName);

      writeFileSync(
        androidProjRoot + `/app/src/main/java/com/rosamuel/${androidBundlePostfix}/` + navViewFileName,
        viewFile
      );
      writeFileSync(
        androidProjRoot + `/app/src/main/java/com/rosamuel/${androidBundlePostfix}/` + navViewManagerName,
        managerFile
      );
      writeFileSync(
        androidProjRoot + `/app/src/main/java/com/rosamuel/${androidBundlePostfix}/` + navViewActivityPackageFileName,
        packageFile
      );
      addLayoutFiles(androidProjRoot + '/app/src/main/res', navViewActivityLayoutFileName, layoutFile);

      return cfg;
    },
  ]);
}

function withAndroidPackageBridging(config) {
  const installBridgingPackage = 'packages.add(new NavigationViewReactPackage());\n';
  return withMainApplication(config, (cfg) => {
    const content = cfg.modResults.contents;
    const brigingPackageInstall = mergeContents({
      tag: 'implementation installer',
      src: content,
      newSrc: installBridgingPackage,
      anchor: /packages =/,
      offset: 1,
      comment: '//',
    });
    if (!brigingPackageInstall.didMerge) {
      console.error("ERROR: Cannot add block to the project's main application because it's malformed");
      return config;
    }
    cfg.modResults.contents = brigingPackageInstall.contents;
    return cfg;
  });
}

function withMapboxStrings(config, { RNMapboxAccessToken }) {
  return withStringsXml(config, (cfg) => {
    cfg.modResults = setStrings(cfg.modResults, RNMapboxAccessToken, 'mapbox_access_token');
    return cfg;
  });
}

function setStrings(strings, value, name) {
  // Helper to add string.xml JSON items or overwrite existing items with the same name.
  return AndroidConfig.Strings.setStringItem(
    [
      // XML represented as JSON
      // <string name="expo_custom_value" translatable="false">value</string>
      { $: { name, translatable: 'false' }, _: value },
    ],
    strings
  );
}

function withMapboxAppBuildGradle(config) {
  return withAppBuildGradle(config, (cfg) => {
    const content = cfg.modResults.contents;

    const mapboxDropinUIInstaller =
      '    implementation "com.mapbox.maps:android:10.16.0" \n implementation "androidx.constraintlayout:constraintlayout:2.1.4" \n implementation "com.mapbox.navigation:android:2.14.2"';
    const dropinUIImplementationInstall = mergeContents({
      tag: 'add mapbox dependency: see plugins/mapboxNavigation/index.js',
      src: content,
      newSrc: mapboxDropinUIInstaller,
      anchor: /dependencies {/, // BEWARE: regex anchors depend on the order in which you mergeContents()
      offset: 1,
      comment: '//',
    });

    const kotlinPluginDependencies =
      'apply plugin: "kotlin-android"\n\nallprojects {\n    repositories {\n        mavenCentral()\n        google()\n    }\n} \nbuildscript {\n  ext.kotlin_version = "1.7.0"\n\n    repositories {\n        mavenCentral()\n        google()\n    }\n\n  dependencies {\n    classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"\n  }\n}';
    const contentsWithKotlin = mergeContents({
      tag: 'add Kotlin plugin and dependencies: see plugins/mapboxNavigation/index.js',
      src: dropinUIImplementationInstall.contents,
      newSrc: kotlinPluginDependencies,
      anchor: /apply plugin: "com.android.application"/, // BEWARE: regex anchors depend on the order in which you mergeContents()
      offset: 1,
      comment: '//',
    });

    if (!dropinUIImplementationInstall.didMerge || !contentsWithKotlin.didMerge) {
      console.error(
        "ERROR: Cannot add block to the project's android/Gradle because it's malformed. Please report this with a copy of your project Gradle."
      );
      return config;
    }

    return {
      ...cfg,
      modResults: {
        ...cfg.modResults,
        contents: contentsWithKotlin.contents,
      },
    };
  });
}

function withMapboxNavigation(config, { RNMapboxAccessToken, androidBundlePostfix }) {
  config = withMapboxStrings(config, { RNMapboxAccessToken });
  // config = withAndroidBridgeFiles(config, { androidBundlePostfix });
  config = withAndroidViewBridgeFiles(config, { androidBundlePostfix });

  return withPlugins(config, [
    addManifestMods,
    withAndroidPackageBridging,
    withMapboxNavigationPod,
    withMapboxNavigationInfoPlist,
    withMapboxNavigationReactBridge,
    withMapboxAppBuildGradle,
  ]);
}

module.exports = withMapboxNavigation;
