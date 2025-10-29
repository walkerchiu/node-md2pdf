/**
 * PlantUML installation path resolver
 * Automatically detects PlantUML JAR location across different platforms
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface PlantUMLPaths {
  jarPath?: string;
  commandPath?: string;
  useCommand: boolean;
}

/**
 * Resolve PlantUML installation paths for the current platform
 */
export function resolvePlantUMLPaths(): PlantUMLPaths {
  // First, try to find plantuml command in PATH
  const commandPath = findPlantUMLCommand();
  if (commandPath) {
    return {
      commandPath,
      useCommand: true,
    };
  }

  // If command not found, try to locate JAR file
  const jarPath = findPlantUMLJar();
  if (jarPath) {
    return {
      jarPath,
      useCommand: false,
    };
  }

  // Return fallback configuration
  return {
    useCommand: false,
  };
}

/**
 * Find plantuml command in system PATH
 */
function findPlantUMLCommand(): string | undefined {
  try {
    const result = execSync('which plantuml', {
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim();

    if (result && fs.existsSync(result)) {
      return result;
    }
  } catch (error) {
    // Command not found, try Windows
    if (process.platform === 'win32') {
      try {
        const result = execSync('where plantuml', {
          encoding: 'utf8',
          stdio: 'pipe',
        }).trim();

        if (result && fs.existsSync(result)) {
          return result;
        }
      } catch (winError) {
        // plantuml command not found on Windows either
      }
    }
  }

  return undefined;
}

/**
 * Find PlantUML JAR file in common locations
 */
function findPlantUMLJar(): string | undefined {
  const possiblePaths = getPlatformSpecificJarPaths();

  for (const jarPath of possiblePaths) {
    if (fs.existsSync(jarPath)) {
      return jarPath;
    }
  }

  return undefined;
}

/**
 * Get platform-specific possible JAR locations
 */
function getPlatformSpecificJarPaths(): string[] {
  const platform = process.platform;

  switch (platform) {
    case 'darwin': // macOS
      return [
        // Homebrew (Intel)
        '/usr/local/Cellar/plantuml/*/libexec/plantuml.jar',
        '/usr/local/lib/plantuml.jar',
        '/usr/local/bin/plantuml.jar',

        // Homebrew (Apple Silicon)
        '/opt/homebrew/Cellar/plantuml/*/libexec/plantuml.jar',
        '/opt/homebrew/lib/plantuml.jar',
        '/opt/homebrew/bin/plantuml.jar',

        // MacPorts
        '/opt/local/share/java/plantuml/plantuml.jar',

        // Manual installation
        '/usr/local/share/plantuml/plantuml.jar',
        `${process.env.HOME}/.local/share/plantuml/plantuml.jar`,
      ].flatMap(expandGlobPath);

    case 'linux':
      return [
        // System package managers
        '/usr/share/plantuml/plantuml.jar',
        '/usr/share/java/plantuml/plantuml.jar',
        '/usr/local/share/plantuml/plantuml.jar',
        '/usr/local/lib/plantuml.jar',
        '/usr/local/bin/plantuml.jar',

        // Snap
        '/snap/plantuml/current/plantuml.jar',

        // Flatpak
        '/var/lib/flatpak/app/net.sourceforge.plantuml/current/active/files/plantuml.jar',

        // User installations
        `${process.env.HOME}/.local/share/plantuml/plantuml.jar`,
        `${process.env.HOME}/.local/lib/plantuml.jar`,
        `${process.env.HOME}/plantuml/plantuml.jar`,
      ];

    case 'win32': // Windows
      return [
        // Common installation directories
        'C:\\plantuml\\plantuml.jar',
        'C:\\Program Files\\PlantUML\\plantuml.jar',
        'C:\\Program Files (x86)\\PlantUML\\plantuml.jar',

        // Chocolatey
        'C:\\ProgramData\\chocolatey\\lib\\plantuml\\tools\\plantuml.jar',

        // Scoop
        `${process.env.USERPROFILE}\\scoop\\apps\\plantuml\\current\\plantuml.jar`,

        // User installations
        `${process.env.USERPROFILE}\\plantuml\\plantuml.jar`,
        `${process.env.APPDATA}\\plantuml\\plantuml.jar`,
        `${process.env.LOCALAPPDATA}\\plantuml\\plantuml.jar`,
      ];

    default:
      return [
        '/usr/share/plantuml/plantuml.jar',
        '/usr/local/share/plantuml/plantuml.jar',
        `${process.env.HOME}/.local/share/plantuml/plantuml.jar`,
      ];
  }
}

/**
 * Expand glob-like paths (simple * expansion for version directories)
 */
function expandGlobPath(pathPattern: string): string[] {
  if (!pathPattern.includes('*')) {
    return [pathPattern];
  }

  try {
    const basePath = pathPattern.substring(0, pathPattern.indexOf('*'));
    const suffix = pathPattern.substring(pathPattern.indexOf('*') + 1);

    if (!fs.existsSync(basePath)) {
      return [];
    }

    const entries = fs.readdirSync(basePath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(basePath, entry.name, suffix))
      .filter((fullPath) => fs.existsSync(fullPath));
  } catch (error) {
    return [];
  }
}

/**
 * Get default PlantUML configuration with auto-detected paths
 */
export function getDefaultPlantUMLConfig() {
  const paths = resolvePlantUMLPaths();

  return {
    JAVA_PATH: 'java',
    JAR_PATH: paths.jarPath || '/usr/local/bin/plantuml.jar', // fallback
    COMMAND_PATH: paths.commandPath,
    USE_COMMAND: paths.useCommand,
    JAVA_OPTIONS: ['-Xmx1024m', '-Djava.awt.headless=true'],
    TIMEOUT: 30000,
    DEBUG: false,
  };
}
