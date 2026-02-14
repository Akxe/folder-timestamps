# Folder Timestamps Analyzer

A Deno application that recursively analyzes folders and reports the latest created and modified file timestamps for each directory in the hierarchy.

## Features

- 📂 Recursively scans all subdirectories
- 📅 Tracks latest file creation dates per folder
- ✏️ Tracks latest file modification dates per folder
- 📊 Displays results in a clean table format
- 🚀 Compiles to standalone executable (no Deno runtime needed)

## Prerequisites

- [Deno](https://deno.land/) (v1.0 or higher)

## Installation

1. Clone or download this repository
2. No additional dependencies required!

## Usage

### Running with Deno

```bash
# Run directly with Deno
deno run --allow-read folder-timestamps.ts <directory-path>

# Examples
deno run --allow-read folder-timestamps.ts ./my-project
deno run --allow-read folder-timestamps.ts C:\Users\Documents
```

### Compiling to Executable

#### On Windows:
```bash
# Run the batch file
compile.bat

# Or manually
deno compile --allow-read --output folder-timestamps folder-timestamps.ts
```

#### On Linux/Mac:
```bash
# Make the script executable and run it
chmod +x compile.sh
./compile.sh

# Or manually
deno compile --allow-read --output folder-timestamps folder-timestamps.ts
```

### Running the Compiled Executable

#### On Windows:
```bash
folder-timestamps.exe "C:\path\to\folder"
```

#### On Linux/Mac:
```bash
./folder-timestamps /path/to/folder
```

## Command Line Options

```
folder-timestamps <directory-path>
```

- `<directory-path>` - Path to the root directory to analyze
- `--help, -h` - Show help message

## Output Format

The application displays results in a table with three columns:

```
┌──────────────────────┬──────────────┬──────────────┐
│ Folder Path          │ Created      │ Modified     │
├──────────────────────┼──────────────┼──────────────┤
│ root                 │ 2026-05-01   │ 2025-08-13   │
│ root\dir1            │ 2026-05-01   │ 2025-08-13   │
│ root\dir2            │ 2026-02-01   │ 2025-04-13   │
│ root\dir5\sub-dir2   │ 2024-01-15   │ 2024-03-20   │
└──────────────────────┴──────────────┴──────────────┘
```

- **Folder Path**: The path to the directory
- **Created**: Latest file creation date in that folder (including subdirectories)
- **Modified**: Latest file modification date in that folder (including subdirectories)

## How It Works

### Main Functions

1. **`printHelp()`** - Displays usage instructions and help information

2. **`isValidDirectory(path)`** - Validates if the provided path exists and is a directory

3. **`getFileStats(filePath)`** - Retrieves creation and modification timestamps for a file

4. **`scanDirectory(dirPath, stats)`** - Recursively scans directories and collects file timestamps
   - Processes all files in the current directory
   - Recursively processes all subdirectories
   - Aggregates timestamps to show the latest dates

5. **`formatDate(date)`** - Formats dates to YYYY-MM-DD format

6. **`displayResults(stats)`** - Displays the collected statistics in a formatted table

7. **`main()`** - Main entry point that orchestrates the application flow

## Algorithm Logic

The application works by:

1. Starting at the root directory
2. For each folder:
   - Scanning all files and recording their creation/modification dates
   - Recursively scanning all subdirectories
   - Bubbling up the latest dates from subdirectories to parent directories
3. The root folder ends up with the latest dates from the entire tree

## Error Handling

- Invalid paths are detected and reported with a clear error message
- Permission errors during directory scanning are caught and logged
- Missing arguments trigger the help display

## Permissions

The application requires `--allow-read` permission to access the file system.

## Examples

### Example 1: Analyze current directory
```bash
folder-timestamps .
```

### Example 2: Analyze specific directory
```bash
folder-timestamps C:\Projects\my-app
```

### Example 3: Show help
```bash
folder-timestamps --help
```

## License

This project is free to use and modify.

## Version

1.0.0
