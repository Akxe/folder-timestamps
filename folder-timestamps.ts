#!/usr/bin/env -S deno run --allow-read

/**
 * Folder Timestamps Analyzer
 * Recursively analyzes folders and reports the latest created and modified file dates
 */

interface FolderStats {
	path: string;
	latestCreated: Date | null;
	latestModified: Date | null;
}

/**
 * Prints the help message explaining how to use the application
 */
function printHelp(): void {
	console.log(`
┌─────────────────────────────────────────────────────────────────┐
│           Folder Timestamps Analyzer                            │
└─────────────────────────────────────────────────────────────────┘

DESCRIPTION:
	Recursively scans a directory and reports the latest created and
	modified file timestamps for each folder in the hierarchy.

USAGE:
	folder-timestamps <directory-path>

ARGUMENTS:
	<directory-path>    Path to the root directory to analyze

OPTIONS:
	--help, -h          Show this help message

EXAMPLES:
	folder-timestamps /path/to/folder
	folder-timestamps ./my-project
	folder-timestamps C:\\Users\\Documents

OUTPUT FORMAT:
	Displays a table with three columns:
	- Folder Path
	- Latest Created (last file creation date in folder)
	- Latest Modified (last file modification date in folder)

NOTES:
	- Requires read permissions for the target directory
	- Recursively processes all subdirectories
	- Empty folders show no dates
	- The root folder shows the latest dates from all its contents

VERSION: 1.0.0
`);
}

/**
 * Validates if the provided path exists and is a directory
 * @param path - The path to validate
 * @returns true if path is a valid directory, false otherwise
 */
async function isValidDirectory(path: string): Promise<boolean> {
	try {
		const stat = await Deno.stat(path);
		return stat.isDirectory;
	} catch {
		return false;
	}
}

/**
 * Gets the creation and modification times for a file
 * @param filePath - Path to the file
 * @returns Object containing birthtime and mtime, or null values if unavailable
 */
async function getFileStats(filePath: string): Promise<{
	birthtime: Date | null;
	mtime: Date | null;
}> {
	try {
		const stat = await Deno.stat(filePath);
		return {
			birthtime: stat.birthtime,
			mtime: stat.mtime,
		};
	} catch {
		return { birthtime: null, mtime: null };
	}
}

/**
 * Recursively scans a directory and collects file timestamps
 * @param dirPath - Path to the directory to scan
 * @param stats - Accumulator for folder statistics
 * @returns Array of FolderStats for all folders processed
 */
async function scanDirectory(
	dirPath: string,
	stats: FolderStats[] = []
): Promise<FolderStats[]> {
	const folderStat: FolderStats = {
		path: dirPath,
		latestCreated: null,
		latestModified: null,
	};

	try {
		for await (const entry of Deno.readDir(dirPath)) {
			const fullPath = `${dirPath}${Deno.build.os === "windows" ? "\\" : "/"}${entry.name}`;

			if (entry.isFile) {
				const fileStats = await getFileStats(fullPath);

				// Update latest created date
				if (
					fileStats.birthtime &&
					(!folderStat.latestCreated ||
						fileStats.birthtime > folderStat.latestCreated)
				) {
					folderStat.latestCreated = fileStats.birthtime;
				}

				// Update latest modified date
				if (
					fileStats.mtime &&
					(!folderStat.latestModified ||
						fileStats.mtime > folderStat.latestModified)
				) {
					folderStat.latestModified = fileStats.mtime;
				}
			} else if (entry.isDirectory) {
				// Recursively scan subdirectories
				const subStats = await scanDirectory(fullPath, []);
				stats.push(...subStats);

				// Update current folder with subdirectory dates
				for (const subStat of subStats) {
					if (subStat.path === fullPath) {
						if (
							subStat.latestCreated &&
							(!folderStat.latestCreated ||
								subStat.latestCreated > folderStat.latestCreated)
						) {
							folderStat.latestCreated = subStat.latestCreated;
						}

						if (
							subStat.latestModified &&
							(!folderStat.latestModified ||
								subStat.latestModified > folderStat.latestModified)
						) {
							folderStat.latestModified = subStat.latestModified;
						}
					}
				}
			}
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`Error scanning directory ${dirPath}:`, errorMessage);
	}

	// Add current folder stats at the beginning
	stats.unshift(folderStat);
	return stats;
}

/**
 * Formats a date to YYYY-MM-DD format
 * @param date - Date to format
 * @returns Formatted date string or empty string if date is null
 */
function formatDate(date: Date | null): string {
	if (!date) return "-";
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Displays the folder statistics in a formatted table
 * @param stats - Array of folder statistics to display
 */
function displayResults(stats: FolderStats[]): void {
	if (stats.length === 0) {
		console.log("No folders found.");
		return;
	}

	// Calculate column widths
	const maxPathLength = Math.max(
		...stats.map((s) => s.path.length),
		"Folder Path".length
	);
	const dateWidth = 12; // YYYY-MM-DD format plus padding

	// Print header
	console.log("\n┌" + "─".repeat(maxPathLength + 2) + "┬" + "─".repeat(dateWidth + 2) + "┬" + "─".repeat(dateWidth + 2) + "┐");
	console.log(
		`│ ${"Folder Path".padEnd(maxPathLength)} │ ${"Created".padEnd(dateWidth)} │ ${"Modified".padEnd(dateWidth)} │`
	);
	console.log("├" + "─".repeat(maxPathLength + 2) + "┼" + "─".repeat(dateWidth + 2) + "┼" + "─".repeat(dateWidth + 2) + "┤");

	// Print rows
	for (const stat of stats) {
		const path = stat.path.padEnd(maxPathLength);
		const created = formatDate(stat.latestCreated).padEnd(dateWidth);
		const modified = formatDate(stat.latestModified).padEnd(dateWidth);
		console.log(`│ ${path} │ ${created} │ ${modified} │`);
	}

	// Print footer
	console.log("└" + "─".repeat(maxPathLength + 2) + "┴" + "─".repeat(dateWidth + 2) + "┴" + "─".repeat(dateWidth + 2) + "┘");
	console.log(`\nTotal folders analyzed: ${stats.length}\n`);
}

/**
 * Main entry point for the application
 */
async function main(): Promise<void> {
	const args = Deno.args;

	// Check for help flag
	if (
		args.length === 0 ||
		args.includes("--help") ||
		args.includes("-h")
	) {
		printHelp();
		Deno.exit(args.length === 0 ? 1 : 0);
	}

	const targetPath = args[0];

	// Validate directory
	if (!(await isValidDirectory(targetPath))) {
		console.error(`\n❌ Error: '${targetPath}' is not a valid directory.\n`);
		console.log("Use --help for usage information.\n");
		Deno.exit(1);
	}

	console.log(`\n📂 Analyzing folder: ${targetPath}\n`);

	// Scan directory
	const stats = await scanDirectory(targetPath);

	// Display results
	displayResults(stats);
}

// Run the application
if (import.meta.main) {
	main();
}
