import fs from "fs";
import path from "path";

// Define interfaces for type safety
interface HeartRateSample {
  time: string;
  hr: number;
}

interface ProcessedData {
  date: string;
  startTime: string;
  duration: string;
  hrAvg: string;
  hrMax: number;
  calories: string;
  hr: HeartRateSample[];
}

// Utility function to convert timestamp to total seconds
function getTotalSeconds(timestamp: string): number {
  const [hours, minutes, seconds] = timestamp.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

// Utility function to format date
function formatDate(date: string): string {
  // Polarbeat dates are dd-mm-yyyy
  const dd = date.substring(0, 2);
  const mm = date.substring(3, 5);
  const yyyy = date.substring(6, 10);
  return `${yyyy}-${mm}-${dd}`;
}

// Process CSV lines into structured data
function processLines(lines: string[]): ProcessedData {
  const headerRow = lines[1].split(",");
  const date = headerRow[2];
  const startTime = headerRow[3];
  const duration = headerRow[4];
  const hrAvg = headerRow[6];
  const calories = headerRow[11];

  const headers = lines[2].split(",");
  const rows = lines.slice(3).map((line) => {
    const values = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || "";
    });
    return row;
  });

  const hrSamples: HeartRateSample[] = rows
    .map((row) => {
      const timestamp = row["Time"];
      const hr = parseInt(row["HR (bpm)"], 10);
      const seconds = getTotalSeconds(timestamp);
      if (seconds % 30 === 0) {
        return { time: timestamp, hr };
      }
      return null;
    })
    .filter((sample): sample is HeartRateSample => sample !== null);

  const hrMax = Math.max(...hrSamples.map((sample) => sample.hr));

  return { date, startTime, duration, hrAvg, hrMax, calories, hr: hrSamples };
}

// Write the processed data to an output file
function writeOutputFile(obj: ProcessedData, outputPath: string): void {
  const formattedDate = formatDate(obj.date);
  const noteTitle = `${formattedDate} - Taekwondo.md`;
  const noteContent = `---
type: exercise
date: ${formattedDate}
graph-key: journal
exercise: Taekwondo
start-time: ${obj.startTime}
duration: ${obj.duration}
calories: ${obj.calories}
hr-avg: ${obj.hrAvg}
hr-max: ${obj.hrMax}
hr-data:
${obj.hr
  .map((entry) => `  - { time: ${entry.time}, hr: ${entry.hr} }\n`)
  .join("")}
---
[[${formattedDate}]]
#### Heart Rate
\`\`\`dataviewjs
const hrData = dv.current()['hr-data'];

// Extract time and heart rate values
const labels = hrData.map(entry => entry.time);
const hrValues = hrData.map(entry => entry.hr);

// Calculate average heart rate
const totalHr = hrValues.reduce((sum, hr) => sum + hr, 0);
const avgHr = hrValues.length > 0 ? parseFloat((totalHr / hrValues.length).toFixed(1)) : 0;

// Create an array for the average line
const avgHrLine = new Array(hrValues.length).fill(avgHr);

const chartData = {
    type: 'line',
    data: {
        labels: labels,
        datasets: [
            {
                label: 'Heart Rate',
                data: hrValues,
                borderColor: '#cfcfcf',
                backgroundColor: '#cfcfcf',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.5
            },
            {
                label: \`Average Heart Rate (\${avgHr} bpm)\`,
                data: avgHrLine,
                borderColor: '#f09595',
                backgroundColor: '#f09595',
                borderWidth: 2,
                pointRadius: 0,
                borderDash: [5, 5]
            }
        ]
    },
    options: {
        responsive: true,
        scales: {
            x: { 
	            title: { display: true, text: 'Time' } },
            y: { 
	            title: { display: true, text: 'Heart Rate (bpm)' }, 
	            beginAtZero: false
	        }
        },
        "plugins": {
	      "annotation": {
	        "annotations": {
	          "hrZone0": {
	            "type": "box",
	            "yMin": 160,
	            "yMax": 180,
	            "backgroundColor": "#cf1b1b22",
	            "borderWidth": 0
	          },
	          "hrZone1": {
	            "type": "box",
	            "yMin": 140,
	            "yMax": 160,
	            "backgroundColor": "#cf6f1b22",
	            "borderWidth": 0
	          },
	          "hrZone2": {
	            "type": "box",
	            "yMin": 120,
	            "yMax": 140,
	            "backgroundColor": "#cfc91b22",
	            "borderWidth": 0
	          },
	          "hrZone3": {
	            "type": "box",
	            "yMin": 100,
	            "yMax": 120,
	            "backgroundColor": "#54cf1b22",
	            "borderWidth": 0
	          },
	          "hrZone4": {
	            "type": "box",
	            "yMin": 80,
	            "yMax": 100,
	            "backgroundColor": "#1bc3cf22",
	            "borderWidth": 0
	          },
	          "hrZone5": {
	            "type": "box",
	            "yMin": 60,
	            "yMax": 80,
	            "backgroundColor": "#88888822",
	            "borderWidth": 0
	          }
	        }
	      }
	    },
    }
};

window.renderChart(chartData, this.container);
\`\`\`
`;

  const outputFilePath = path.join(outputPath, noteTitle);
  fs.writeFile(outputFilePath, noteContent, "utf8", (writeErr) => {
    if (writeErr) {
      console.error(`Error writing note for match ${noteTitle}:`, writeErr);
    }
  });
}

// Process a CSV file
function processCsv(filePath: string, outputPath: string): void {
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading the file:", err);
      return;
    }

    const lines = data.split("\n").filter((line) => line.trim() !== "");
    const obj = processLines(lines);
    writeOutputFile(obj, outputPath);
  });
}

// Process all CSV files in a directory
function processDirectory(importPath: string, outputPath: string): void {
  fs.readdir(importPath, (err, files) => {
    if (err) {
      console.error("Error reading folder:", err);
      return;
    }

    let processedCount = 0;

    files.forEach((file) => {
      const filePath = path.join(importPath, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error("Error reading file stats:", err);
          return;
        }
        if (stats.isFile()) {
          console.log(`Processing file: ${file}`);
          processCsv(filePath, outputPath);
          processedCount++;
        }
      });
    });

    // Log the total number of files processed
    console.log(`Total files processed: ${processedCount}`);
  });
}

function processPolarFiles(importPath: string, outputPath: string): void {
  console.log("Processing Polar Beat Data");
  console.log(`  Import Path: ${importPath}`);
  console.log(`  Output Path: ${outputPath}`);
  processDirectory(importPath, outputPath);
}

// Export main execution function for use in a central composer
export { processPolarFiles };