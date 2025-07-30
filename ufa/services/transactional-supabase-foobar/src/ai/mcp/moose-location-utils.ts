import path from "path";
import fs from "fs";

export function findWorkspaceRoot(startPath: string): string {
  let currentPath = startPath;

  while (currentPath !== path.dirname(currentPath)) {
    // Check for workspace markers
    const packageJsonPath = path.join(currentPath, "package.json");
    const pnpmWorkspacePath = path.join(currentPath, "pnpm-workspace.yaml");
    const turboJsonPath = path.join(currentPath, "turbo.json");

    if (
      fs.existsSync(packageJsonPath) &&
      fs.existsSync(pnpmWorkspacePath) &&
      fs.existsSync(turboJsonPath)
    ) {
      return currentPath;
    }

    currentPath = path.dirname(currentPath);
  }

  throw new Error(
    "Could not find workspace root. Looking for directory with package.json, pnpm-workspace.yaml, and turbo.json"
  );
}

export function searchForAnalyticalService(
  workspaceRoot: string
): string | null {
  try {
    // Search for directories containing moose.config.toml
    const searchPaths = [
      path.join(workspaceRoot, "ufa/services"),
      path.join(workspaceRoot, "services"),
      path.join(workspaceRoot, "odw/services"),
    ];

    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        const subdirs = fs
          .readdirSync(searchPath, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name);

        for (const subdir of subdirs) {
          const servicePath = path.join(searchPath, subdir);
          const configPath = path.join(servicePath, "moose.config.toml");

          if (fs.existsSync(configPath)) {
            // Check if this is specifically the analytical service
            if (subdir.includes("analytical")) {
              return servicePath;
            }
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.warn("Error searching for analytical service:", error);
    return null;
  }
}

export function findAnalyticalMooseServicePath(currentDir: string): string {
  // Find workspace root dynamically
  const workspaceRoot = findWorkspaceRoot(currentDir);

  // Look for analytical Moose service
  const possiblePaths = [
    path.resolve(workspaceRoot, "ufa/services/analytical-moose-foobar"),
    // Add other possible locations if the service gets moved
    path.resolve(workspaceRoot, "services/analytical-moose-foobar"),
  ];

  for (const analyticalServicePath of possiblePaths) {
    const configPath = path.join(analyticalServicePath, "moose.config.toml");
    if (fs.existsSync(configPath)) {
      return analyticalServicePath;
    }
  }

  // If not found in known locations, search the workspace
  const foundPath = searchForAnalyticalService(workspaceRoot);
  if (foundPath) {
    return foundPath;
  }

  throw new Error(
    `Analytical Moose service not found. Searched in: ${possiblePaths.join(", ")}. ` +
      `Please ensure the analytical service exists and has a moose.config.toml file.`
  );
}
