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
\`\`\`chartsview
#-----------------#
#- chart type    -#
#-----------------#
type: Line

#-----------------#
#- chart data    -#
#-----------------#
data: |
  dataviewjs:
  return dv.current()
           ['hr-data']
           .map(entry => ({ time: entry.time, hr: entry.hr }));

#-----------------#
#- chart options -#
#-----------------#
options:
  height: 200
  xField: "time"
  yField: "hr"
  smooth: true
  xAxis:
    label:
      autoHide: true
      autoRotate: true
  yAxis:
    title:
      text: "Heart Rate (bpm)"
  annotations:
    - type: "line"
      start: ["min", 128]
      end: ["max", 128]
      style:
        stroke: "rgba(88, 10, 10, 1.0)"
      text:
        content: "Fat/Fit"
        offsetY: -2
        style:
          textAlign: "left"
          fontSize: 10
          fill: "rgba(88, 10, 10, 1.0)"
          textBaseline: "bottom"
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

    files.forEach((file) => {
      const filePath = path.join(importPath, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error("Error reading file stats:", err);
          return;
        }
        if (stats.isFile()) {
          processCsv(filePath, outputPath);
        }
      });
    });
  });
}

// Export functions for use in a central composer
export { processCsv, processDirectory, processLines, writeOutputFile };