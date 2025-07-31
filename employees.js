// Employee management
let employees = [];

// Load employees from localStorage
function loadEmployees() {
    const stored = localStorage.getItem('employees');
    employees = stored ? JSON.parse(stored) : [];
    displayEmployees();
    updateEmployeeSelect();
}

// Save employees to localStorage
function saveEmployees() {
    localStorage.setItem('employees', JSON.stringify(employees));
    displayEmployees();
    updateEmployeeSelect();
}

// Add new employee
function addEmployee() {
    const id = document.getElementById('newEmployeeId').value.trim();
    const name = document.getElementById('newEmployeeName').value.trim();
    
    if (!id || !name) {
        alert('Please enter both ID and name');
        return;
    }
    
    if (employees.some(emp => emp.id === id)) {
        alert('Employee ID already exists');
        return;
    }
    
    employees.push({ id, name });
    saveEmployees();
    
    // Clear inputs
    document.getElementById('newEmployeeId').value = '';
    document.getElementById('newEmployeeName').value = '';
}

// Remove employee
function removeEmployee(id) {
    employees = employees.filter(emp => emp.id !== id);
    saveEmployees();
}

// Display employees in list
function displayEmployees() {
    const list = document.getElementById('employeeList');
    list.innerHTML = employees.map(emp => `
        <div class="employee-item">
            <span>${emp.id} - ${emp.name}</span>
            <button class="btn btn-sm btn-danger" onclick="removeEmployee('${emp.id}')">Remove</button>
        </div>
    `).join('');
}

// Update employee select dropdown
function updateEmployeeSelect() {
    const select = document.getElementById('employeeSelect');
    select.innerHTML = employees.map(emp => `
        <option value="${emp.id}">${emp.name}</option>
    `).join('');
}

// Bulk upload employees
function bulkUpload() {
    const file = document.getElementById('bulkUploadFile').files[0];
    if (!file) {
        alert('Please select a file');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csv = e.target.result;
            const lines = csv.split('\n');
            
            // Skip header row
            for (let i = 1; i < lines.length; i++) {
                const [id, name] = lines[i].split(',').map(x => x.trim());
                if (id && name && !employees.some(emp => emp.id === id)) {
                    employees.push({ id, name });
                }
            }
            
            saveEmployees();
            alert('Employees uploaded successfully');
            document.getElementById('bulkUploadFile').value = '';
            
        } catch (error) {
            alert('Error processing file: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// Load employees when page loads
document.addEventListener('DOMContentLoaded', loadEmployees);
