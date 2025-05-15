import * as fs from "fs";
import * as path from "path";

type HrSample = { time: string; hr: number };
type ProcessedData = {
    date: string;
    startTime: string;
    duration: string;
    hrAvg: string;
    hrMax: number;
    calories: string;
    hr: HrSample[];
};

function getTotalSeconds(timestamp: string): number {
    const [hours, minutes, seconds] = timestamp.split(':').map(Number);
    return (hours * 3600) + (minutes * 60) + seconds;
}

function formatDate(date: string): string {
    // Polarbeat dates are dd-mm-yyyy (source)
    const dd = date.substring(0, 2);
    const mm = date.substring(3, 5);
    const yyyy = date.substring(6, 10);
    return `${yyyy}-${mm}-${dd}`;
}

function processLines(lines: string[]): ProcessedData {
    const headerRow = lines[1].split(',');
    const date = headerRow[2];
    const startTime = headerRow[3];
    const duration = headerRow[4];
    const hrAvg = headerRow[6];
    const calories = headerRow[11];

    const headers = lines[2].split(',');

    const rows = lines.slice(3).map(line => {
        const values = line.split(',');
        const row: { [key: string]: string } = {};
        headers.forEach((header, index) => {
            row[header.trim()] = values[index]?.trim() || '';
        });
        return row;
    });

    let hrSamples: HrSample[] = [];
    rows.forEach(row => {
        const timestamp = row['Time'];
        const hr = Number(row['HR (bpm)']);
        const seconds = getTotalSeconds(timestamp);
        if (seconds % 30 === 0) {
            hrSamples.push({ time: timestamp, hr: hr });
        }
    });

    const hrMax = Math.max(...hrSamples.map(sample => sample.hr));

    return { date, startTime, duration, hrAvg, hrMax, calories, hr: hrSamples };
}

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
${obj.hr.map(entry => {
    return `  - { time: ${entry.time}, hr: ${entry.hr} }\n`;
}).join('')}
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
    fs.writeFileSync(outputFilePath, noteContent, "utf8");
}

function processCsv(filePath: string, outputPath: string): void {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n').filter(line => line.trim() !== '');
    const obj = processLines(lines);
    writeOutputFile(obj, outputPath);
}

/**
 * Main function to convert all CSVs in importPath to outputPath.
 * Can be called from runner or CLI.
 */
export function convertPolarbeat(importPath: string = './TKDImport', outputPath: string = './TKDOutput'): void {
    if (!fs.existsSync(importPath)) {
        console.error(`Import path "${importPath}" does not exist.`);
        return;
    }
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }
    const files = fs.readdirSync(importPath);
    files.forEach(file => {
        const filePath = path.join(importPath, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
            processCsv(filePath, outputPath);
        }
    });
}

// Allow running directly from CLI
if (require.main === module) {
    const importPath = process.argv[2] || './input/polarbeat';
    const outputPath = process.argv[3] || './output/polarbeat';
    convertPolarbeat(importPath, outputPath);
}
