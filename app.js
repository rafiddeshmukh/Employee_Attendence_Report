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
