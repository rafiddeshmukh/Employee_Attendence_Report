// Attendance report generation
function generateReport() {
    const file = document.getElementById('csvFile').files[0];
    const selectedEmployees = getSelectedEmployees();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!file || !selectedEmployees.length || !startDate || !endDate) {
        alert('Please fill in all required fields');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csv = e.target.result;
            processAttendanceData(csv, selectedEmployees, startDate, endDate);
        } catch (error) {
            alert('Error processing file: ' + error.message);
        }
    };
    reader.readAsText(file);
}
