const fs = require('fs');
const path = require("path");

function getTotalSeconds(timestamp) {
    const [hours, minutes, seconds] = timestamp.split(':').map(Number);
    return (hours * 3600) + (minutes * 60) + seconds;
}

function formatDate(date) {
    // Polarbeat dates are dd-mm-yyyy (source)
    const dd = date.substring(0, 2);
    const mm = date.substring(3, 5);
    const yyyy = date.substring(6, 10);
    return `${yyyy}-${mm}-${dd}`;
};

function processLines(lines) {
    // Get the date
    const headerRow = lines[1].split(',');
    const date = headerRow[2];
    const startTime = headerRow[3];
    const duration = headerRow[4];
    const hrAvg = headerRow[6];
    const calories = headerRow[11];

    // Extract headers from the third line
    const headers = lines[2].split(',');

    // Use header values to build an addressable object from each row
    const rows = lines.slice(3).map(line => {
        const values = line.split(',');
        const row = {};

        // Map each value to the corresponding header
        headers.forEach((header, index) => {
            row[header.trim()] = values[index]?.trim() || '';
        });

        return row;
    });

    let hrSamples = [];
    rows.map(row => {
        const timestamp = row['Time'];
        const hr = row['HR (bpm)'];
        const seconds = getTotalSeconds(timestamp);
        if (seconds % 30 === 0) {
            hrSamples.push({ time: timestamp, hr: hr });
        }
    });

    // Find max hr
    const hrMax = Math.max(...hrSamples.map(sample => sample.hr));
    
    return { date: date, startTime: startTime, duration: duration, hrAvg: hrAvg, hrMax: hrMax, calories: calories, hr: hrSamples };
}

function writeOutputFile(obj, outputPath) {
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

    // Write the note to a file in the appropriate year folder
    const outputFilePath = path.join(outputPath, noteTitle);
    fs.writeFile(outputFilePath, noteContent, "utf8", (writeErr) => {
        if (writeErr) {
            console.error(`Error writing note for match ${noteTitle}:`, writeErr);
        }
    });
}

// Function to process the CSV file
function processCsv(filePath, outputPath) {
    const lines = fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading the file:', err);
            return;
        }

        // Split the data into lines
        const lines = data.split('\n').filter(line => line.trim() !== '');

        // Process the lines into a data object
        const obj = processLines(lines);

        // Write output file
        writeOutputFile(obj, outputPath);
    });
}


// TKD import path
const importPath = './TKDImport';
const outputPath = './TKDOutput';

// Read the directory and list file names
fs.readdir(importPath, (err, files) => {
    if (err) {
        console.error('Error reading folder:', err);
        return;
    }

    files.forEach(file => {
        const filePath = path.join(importPath, file);
        // Check if it's a file, not a directory
        fs.stat(filePath, (err, stats) => {
            if (err) {
                console.error('Error reading file stats:', err);
                return;
            }
            if (stats.isFile()) {
                processCsv(filePath, outputPath);
            }
        });
    });
});

// Example usage:
//const filePath = './2024-11-18-Taekwondo.csv'; // Replace with your CSV file path

// Call the processCsv function
//processCsv(filePath);

