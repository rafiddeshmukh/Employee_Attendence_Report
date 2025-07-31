function preprocessCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                // Try different encodings
                const encodings = ['utf-8', 'latin1', 'iso-8859-1', 'cp1252'];
                let processedData = null;
                
                for (const encoding of encodings) {
                    try {
                        const decoder = new TextDecoder(encoding);
                        const data = decoder.decode(new Uint8Array(e.target.result));
                        
                        // Parse CSV
                        const lines = data.split('\n').map(line => 
                            line.split(',').map(cell => cell.trim())
                        );
                        
                        // Create cleaned CSV content
                        const cleanedContent = lines.map(line => line.join(',')).join('\n');
                        
                        // Create cleaned file
                        const cleanedFile = new File(
                            [cleanedContent],
                            'cleaned_' + file.name,
                            { type: 'text/csv' }
                        );
                        
                        processedData = {
                            file: cleanedFile,
                            content: cleanedContent
                        };
                        break;
                    } catch (error) {
                        console.log(`Failed with ${encoding} encoding:`, error);
                        continue;
                    }
                }
                
                if (processedData) {
                    resolve(processedData);
                } else {
                    reject(new Error("Could not process the file with any encoding"));
                }
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(reader.error);
        
        // Read file as array buffer to handle different encodings
        reader.readAsArrayBuffer(file);
    });
}

// Modify your existing file upload handling
document.getElementById('csvFile').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        // Show loading indicator
        const loadingMsg = document.createElement('div');
        loadingMsg.id = 'loadingMessage';
        loadingMsg.innerHTML = 'Processing file...';
        loadingMsg.style.color = 'blue';
        this.parentNode.appendChild(loadingMsg);
        
        // Process the file
        const processedData = await preprocessCSV(file);
        
        // Store the processed data for later use
        window.processedCSVContent = processedData.content;
        
        // Update loading message
        loadingMsg.innerHTML = 'File processed successfully!';
        loadingMsg.style.color = 'green';
        
        // Remove message after 3 seconds
        setTimeout(() => {
            loadingMsg.remove();
        }, 3000);
        
    } catch (error) {
        console.error('Error processing file:', error);
        alert('Error processing file. Please try another file or encoding.');
        
        // Remove loading message if exists
        const loadingMsg = document.getElementById('loadingMessage');
        if (loadingMsg) loadingMsg.remove();
    }
});

// Modify your generate report function to use the processed content
function generateReport() {
    if (!window.processedCSVContent) {
        alert('Please upload and process a CSV file first');
        return;
    }
    
    const selectedEmployees = getSelectedEmployees();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!selectedEmployees.length || !startDate || !endDate) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        processAttendanceData(window.processedCSVContent, selectedEmployees, startDate, endDate);
    } catch (error) {
        alert('Error generating report: ' + error.message);
    }
}

// Add this where you handle the Excel generation
function processAttendanceData(csv, selectedEmployees, startDate, endDate) {
    try {
        const lines = csv.split('\n');
        const headers = lines[0].split(',');
        
        const resultData = selectedEmployees.map(emp => {
            let employeeData = {
                'Employee Name': emp.name
            };
            
            let currentDate = new Date(startDate);
            const endDateTime = new Date(endDate);
            let totalHours = 0;
            let daysWorked = 0;
            
            while (currentDate <= endDateTime) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
                const columnPrefix = `${dateStr} (${dayName})`;
                
                const attendance = lines.find(line => {
                    const cols = line.split(',');
                    return cols[1] === emp.name && cols[5] === dateStr;
                });
                
                if (attendance) {
                    const cols = attendance.split(',');
                    const inTime = cols[6]; // IN_TIME column
                    const outTime = cols[7]; // OUT_TIME column
                    
                    if (inTime && outTime && inTime !== 'OFF' && outTime !== 'OFF') {
                        employeeData[`${columnPrefix}_In`] = inTime;
                        employeeData[`${columnPrefix}_Out`] = outTime;
                        
                        try {
                            const [inHour, inMinute] = inTime.split(':').map(Number);
                            const [outHour, outMinute] = outTime.split(':').map(Number);
                            let hours = outHour - inHour + (outMinute - inMinute) / 60;
                            if (hours < 0) hours += 24;
                            
                            employeeData[columnPrefix] = hours.toFixed(2);
                            totalHours += hours;
                            daysWorked++;
                        } catch (e) {
                            employeeData[columnPrefix] = 'OFF';
                        }
                    } else {
                        employeeData[`${columnPrefix}_In`] = 'OFF';
                        employeeData[`${columnPrefix}_Out`] = 'OFF';
                        employeeData[columnPrefix] = 'OFF';
                    }
                } else {
                    employeeData[`${columnPrefix}_In`] = 'OFF';
                    employeeData[`${columnPrefix}_Out`] = 'OFF';
                    employeeData[columnPrefix] = 'OFF';
                }
                
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            employeeData['Monthly Total'] = `${totalHours.toFixed(2)} (${daysWorked} days)`;
            return employeeData;
        });

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(resultData);
        
        // Set column widths
        const baseWidth = 8.43;
        ws['!cols'] = [
            { width: 25 + baseWidth }, // Employee Name
            ...Array(Object.keys(resultData[0] || {}).length - 2).fill({ width: 10 + baseWidth }),
            { width: 20 + baseWidth }  // Monthly Total
        ];
        
        // Add formatting
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; R++) {
            for (let C = range.s.c; C <= range.e.c; C++) {
                const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
                if (!cell) continue;
                
                cell.s = {
                    font: {
                        bold: R === 0 || C === 0 || C === range.e.c,
                        name: 'Calibri',
                        sz: 11
                    },
                    alignment: {
                        horizontal: C === 0 ? 'left' : 'center',
                        vertical: R === 0 ? 'top' : 'center',
                        wrapText: R === 0
                    },
                    fill: {
                        fgColor: {
                            rgb: R === 0 ? 'D3D3D3' :
                                  C === 0 ? 'E6E6E6' :
                                  C === range.e.c ? 'FFE699' : 'FFFFFF'
                        }
                    }
                };
            }
        }
        
        // Set row height for header
        ws['!rows'] = [{ hpt: 40 }];  // Header row height
        
        XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:-]/g, '').split('.')[0].replace('T', '_');
        const filename = `attendance_${timestamp.slice(0,8)}_${timestamp.slice(9,15)}.xlsx`;
        
        XLSX.writeFile(wb, filename);
        
    } catch (error) {
        console.error('Error processing data:', error);
        alert('Error generating report. Please check the console for details.');
    }
}
