#!/usr/bin/env -S deno run --allow-read

/**
 * Folder Timestamps Analyzer
 * Recursively analyzes folders and reports the latest created and modified file dates
 */

interface FolderStats {
	path: string;
	latestCreated: Date | null;
	latestModified: Date | null;
	fileCount: number;
	cumulativeFileCount: number;
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
	Displays a table with four columns:
	- Folder Path (shown as (root)/subdirectory)
	- Latest Created (last file creation date in folder)
	- Latest Modified (last file modification date in folder)
	- Files (format: current (total) - files in folder and cumulative count)

NOTES:
	- Requires read permissions for the target directory
	- Recursively processes all subdirectories
	- Empty folders show no dates
	- The root folder shows the latest dates from all its contents

VERSION: 1.0.0
`);
}

/**
 * Normalizes a path to be absolute with unified slashes
 * @param path - The path to normalize
 * @returns Normalized absolute path with unified slashes
 */
async function normalizePath(path: string): Promise<string> {
	try {
		// Get the absolute path
		const absolutePath = await Deno.realPath(path);
		// Normalize slashes based on OS
		const separator = Deno.build.os === "windows" ? "\\" : "/";
		return absolutePath.split(/[\\/]/).join(separator);
	} catch {
		// If realPath fails, try to make it absolute manually
		const separator = Deno.build.os === "windows" ? "\\" : "/";
		let absPath = path;
		if (!path.match(/^([a-zA-Z]:)?[\\/]/)) {
			// Relative path, make it absolute
			absPath = `${Deno.cwd()}${separator}${path}`;
		}
		return absPath.split(/[\\/]/).join(separator);
	}
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
		fileCount: 0,
		cumulativeFileCount: 0,
	};

	try {
		for await (const entry of Deno.readDir(dirPath)) {
			const fullPath = `${dirPath}${Deno.build.os === "windows" ? "\\" : "/"}${entry.name}`;

			if (entry.isFile) {
				const fileStats = await getFileStats(fullPath);

				// Increment file count
				folderStat.fileCount++;
				folderStat.cumulativeFileCount++;

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

				// Update current folder with subdirectory dates and file counts
				for (const subStat of subStats) {
					if (subStat.path === fullPath) {
						// Add subdirectory cumulative file count to current folder
						folderStat.cumulativeFileCount += subStat.cumulativeFileCount;

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
 * @param rootPath - The root folder path to display before the table
 */
function displayResults(stats: FolderStats[], rootPath: string): void {
	if (stats.length === 0) {
		console.log("No folders found.");
		return;
	}

	// Determine path separator
	const separator = Deno.build.os === "windows" ? "\\" : "/";
	const rootWithSeparator = rootPath.endsWith(separator) ? rootPath : `${rootPath}${separator}`;

	// Calculate column widths (format paths as (root)/subdir)
	const maxPathLength = Math.max(
		...stats.map((s) => {
			if (s.path === rootPath) return "(root)";
			if (s.path.startsWith(rootWithSeparator)) {
				const relativePath = s.path.substring(rootWithSeparator.length);
				return `(root)/${relativePath.replace(/\\/g, "/")}`;
			}
			return s.path;
		}).map(p => p.length),
		"Folder Path".length
	);
	const dateWidth = 12; // YYYY-MM-DD format plus padding

	// Calculate file count column width based on actual data
	const maxFileCountLength = Math.max(
		...stats.map(s => `${s.fileCount} (${s.cumulativeFileCount})`.length),
		"Files".length
	);
	const fileCountWidth = maxFileCountLength;

	// Print header
	console.log("\n┌" + "─".repeat(maxPathLength + 2) + "┬" + "─".repeat(dateWidth + 2) + "┬" + "─".repeat(dateWidth + 2) + "┬" + "─".repeat(fileCountWidth + 2) + "┐");
	console.log(
		`│ ${"Folder Path".padEnd(maxPathLength)} │ ${"Created".padEnd(dateWidth)} │ ${"Modified".padEnd(dateWidth)} │ ${"Files".padEnd(fileCountWidth)} │`
	);
	console.log("├" + "─".repeat(maxPathLength + 2) + "┼" + "─".repeat(dateWidth + 2) + "┼" + "─".repeat(dateWidth + 2) + "┼" + "─".repeat(fileCountWidth + 2) + "┤");

	// Print rows
	for (const stat of stats) {
		// Display "(root)" for the root folder, otherwise show (root)/relative/path
		let displayPath: string;
		if (stat.path === rootPath) {
			displayPath = "(root)";
		} else if (stat.path.startsWith(rootWithSeparator)) {
			const relativePath = stat.path.substring(rootWithSeparator.length);
			// Normalize slashes to forward slashes for display
			displayPath = `(root)/${relativePath.replace(/\\/g, "/")}`;
		} else {
			displayPath = stat.path;
		}
		const path = displayPath.padEnd(maxPathLength);
		const created = formatDate(stat.latestCreated).padEnd(dateWidth);
		const modified = formatDate(stat.latestModified).padEnd(dateWidth);
		const files = `${stat.fileCount} (${stat.cumulativeFileCount})`.padEnd(fileCountWidth);
		console.log(`│ ${path} │ ${created} │ ${modified} │ ${files} │`);
	}

	// Print footer
	console.log("└" + "─".repeat(maxPathLength + 2) + "┴" + "─".repeat(dateWidth + 2) + "┴" + "─".repeat(dateWidth + 2) + "┴" + "─".repeat(fileCountWidth + 2) + "┘");

	const totalFiles = stats[0]?.cumulativeFileCount || 0;
	console.log(`\nTotal folders analyzed: ${stats.length}`);
	console.log(`Total files: ${totalFiles}\n`);
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

	// Normalize the path to be absolute with unified slashes
	const normalizedPath = await normalizePath(targetPath);

	console.log(`\n📂 Analyzing folder: ${normalizedPath}\n`);

	// Scan directory
	const stats = await scanDirectory(normalizedPath);

	// Display results
	displayResults(stats, normalizedPath);
}

// Run the application
if (import.meta.main) {
	main();
}
