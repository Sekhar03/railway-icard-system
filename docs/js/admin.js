function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.content-section').forEach(section => {
    section.style.display = 'none';
  });
  
  // Show selected section
  document.getElementById(sectionId).style.display = 'block';
  
  // Update active menu item
  document.querySelectorAll('.sidebar a').forEach(link => {
    link.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // Load data if needed
  if (sectionId === 'pending-gaz') {
    loadGazettedApplications();
  } else if (sectionId === 'pending-non-gaz') {
    loadNonGazettedApplications();
  }
}

async function loadGazettedApplications() {
  try {
    const response = await fetch('/api/admin/gazetted');
    const data = await response.json();
    
    const listContainer = document.querySelector('#pending-gaz .application-list');
    listContainer.innerHTML = '';
    
    if (data.length === 0) {
      listContainer.innerHTML = '<p>No pending applications found</p>';
      return;
    }
    
    data.forEach(app => {
      const appItem = document.createElement('div');
      appItem.className = 'application-item';
      appItem.innerHTML = `
        <div class="application-info">
          <h4>${app.name}</h4>
          <p>RUID: ${app.ruid} | Department: ${app.department}</p>
          <small>Submitted: ${new Date(app.createdAt).toLocaleString()}</small>
        </div>
        <div class="application-actions">
          <button class="view-btn" onclick="viewApplication('gazetted', '${app._id}')">View</button>
          <button class="approve-btn" onclick="approveApplication('gazetted', '${app._id}')">Approve</button>
          <button class="reject-btn" onclick="rejectApplication('gazetted', '${app._id}')">Reject</button>
        </div>
      `;
      listContainer.appendChild(appItem);
    });
  } catch (error) {
    console.error('Error loading gazetted applications:', error);
    alert('Failed to load applications. Please try again.');
  }
}

async function loadNonGazettedApplications() {
  try {
    const response = await fetch('/api/admin/non-gazetted');
    const data = await response.json();
    
    const listContainer = document.querySelector('#pending-non-gaz .application-list');
    listContainer.innerHTML = '';
    
    if (data.length === 0) {
      listContainer.innerHTML = '<p>No pending applications found</p>';
      return;
    }
    
    data.forEach(app => {
      const appItem = document.createElement('div');
      appItem.className = 'application-item';
      appItem.innerHTML = `
        <div class="application-info">
          <h4>${app.name}</h4>
          <p>Employee No: ${app.empNo} | Department: ${app.department}</p>
          <small>Submitted: ${new Date(app.createdAt).toLocaleString()}</small>
        </div>
        <div class="application-actions">
          <button class="view-btn" onclick="viewApplication('non-gazetted', '${app._id}')">View</button>
          <button class="approve-btn" onclick="approveApplication('non-gazetted', '${app._id}')">Approve</button>
          <button class="reject-btn" onclick="rejectApplication('non-gazetted', '${app._id}')">Reject</button>
        </div>
      `;
      listContainer.appendChild(appItem);
    });
  } catch (error) {
    console.error('Error loading non-gazetted applications:', error);
    alert('Failed to load applications. Please try again.');
  }
}

async function viewApplication(type, id) {
  try {
    const response = await fetch(`/api/admin/${type}/${id}`);
    const data = await response.json();
    
    // Show application details in a modal or new page
    alert(`Application Details:\nName: ${data.name}\nDepartment: ${data.department}\nStatus: ${data.status || 'Pending'}`);
  } catch (error) {
    console.error('Error viewing application:', error);
    alert('Failed to view application. Please try again.');
  }
}

async function approveApplication(type, id) {
  if (confirm('Are you sure you want to approve this application?')) {
    try {
      const response = await fetch(`/api/admin/${type}/${id}/approve`, {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        alert('Application approved successfully');
        if (type === 'gazetted') {
          loadGazettedApplications();
        } else {
          loadNonGazettedApplications();
        }
      } else {
        alert('Failed to approve application: ' + result.error);
      }
    } catch (error) {
      console.error('Error approving application:', error);
      alert('Failed to approve application. Please try again.');
    }
  }
}

async function rejectApplication(type, id) {
  const reason = prompt('Please enter reason for rejection:');
  if (reason) {
    try {
      const response = await fetch(`/api/admin/${type}/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      const result = await response.json();
      
      if (result.success) {
        alert('Application rejected successfully');
        if (type === 'gazetted') {
          loadGazettedApplications();
        } else {
          loadNonGazettedApplications();
        }
      } else {
        alert('Failed to reject application: ' + result.error);
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      alert('Failed to reject application. Please try again.');
    }
  }
}

// Load gazetted applications by default when page loads
document.addEventListener('DOMContentLoaded', () => {
  loadGazettedApplications();
});

// Helper: Render a single application as a full application view (matches modal)
function renderIdCardHTML(app, type = 'gazetted') {
  // Helper for date formatting
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  };

  // Generate QR code (using qrcode.js if available)
  let qrImg = '';
  if (window.qrcode) {
    const qr = qrcode(0, 'L');
    qr.addData(JSON.stringify({
      id: app.applicationNo || 'N/A',
      name: app.name || 'N/A',
      empNo: type === 'gazetted' ? app.ruid : app.empNo || 'N/A'
    }));
    qr.make();
    qrImg = qr.createImgTag(4);
  } else {
    qrImg = '<div style="width:120px;height:120px;background:#eee;display:inline-block;"></div>';
  }

  // Family table
  let familyTable = '';
  if (app.family && app.family.length > 0) {
    familyTable = `
      <table class="family-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Blood Group</th>
            <th>Relationship</th>
            <th>DOB</th>
            <th>Identification marks(s)</th>
          </tr>
        </thead>
        <tbody>
          ${app.family.map(member => `
            <tr>
              <td>${member.name || 'N/A'}</td>
              <td>${member.bloodGroup || 'N/A'}</td>
              <td>${member.relationship || 'N/A'}</td>
              <td>${member.dob ? formatDate(member.dob) : 'N/A'}</td>
              <td>${member.identificationMarks || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  return `
    <div class="application-view" style="max-width:900px;margin:30px auto 40px auto;box-shadow:0 2px 8px #0001;border-radius:8px;border:1px solid #333;background:#fff;">
      <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;padding:16px 24px 0 24px;">
        <h3 style="margin:0;">ID No: ${app.applicationNo || 'N/A'}</h3>
      </div>
      <div class="modal-body" style="padding:24px;">
        <table class="main-table" style="width:100%;margin-bottom:16px;">
          <tr>
            <td class="label">EMPNO</td>
            <td class="value">${type === 'gazetted' ? app.ruid : app.empNo || 'N/A'}</td>
            <td class="label">EMPNAME</td>
            <td class="value">${app.name || 'N/A'}</td>
            <td class="label">DESIGNATION</td>
            <td class="value">${app.designation || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label">DOB</td>
            <td class="value">${app.dob ? formatDate(app.dob) : 'N/A'}</td>
            <td class="label">DEPARTMENT</td>
            <td class="value">${app.department || 'N/A'}</td>
            <td class="label">STATION</td>
            <td class="value">${app.station || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label">ADDRESS</td>
            <td class="value" colspan="3">${app.address || 'N/A'}</td>
            <td class="label">RLY NUMBER</td>
            <td class="value">${app.rlyNo || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label">MOBILE NUMBER</td>
            <td class="value">${app.mobile || 'N/A'}</td>
            <td class="label">EMERGENCY CONTACT NAME</td>
            <td class="value">${app.emergencyContactName || 'N/A'}</td>
            <td class="label">EMERGENCY CONTACT NO</td>
            <td class="value">${app.emergencyContactNumber || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label">APPLICATION DATE</td>
            <td class="value">${app.createdAt ? formatDate(app.createdAt) : 'N/A'}</td>
            <td class="label">DEPT SL NO</td>
            <td class="value">${app.deptSlNo || 'N/A'}</td>
            <td colspan="2"></td>
          </tr>
        </table>
        <div class="divider" style="border-top:1px solid #ddd;margin:15px 0;"></div>
        <div class="qr-section" style="text-align:center;margin:15px 0;">
          <h4>QR Code</h4>
          <div class="qr-code-container" style="display:inline-block;margin-top:10px;padding:10px;border:1px solid #ddd;background:white;">${qrImg}</div>
        </div>
        <div class="divider" style="border-top:1px solid #ddd;margin:15px 0;"></div>
        <h4>Family Members</h4>
        ${familyTable}
        <div class="image-section" style="display:flex;gap:20px;margin-top:20px;">
          <div class="image-container" style="flex:1;text-align:center;">
            <h4>Photo</h4>
            ${app.photo ? `<img src="/uploads/${app.photo}" alt="Applicant Photo" style="max-width:120px;max-height:150px;border:1px solid #ddd;padding:5px;background:white;">` : 'No photo available'}
          </div>
          <div class="image-container" style="flex:1;text-align:center;">
            <h4>Signature</h4>
            ${app.sign ? `<img src="/uploads/${app.sign}" alt="Applicant Signature" style="max-width:220px;max-height:60px;border:1px solid #ddd;padding:5px;background:white;">` : 'No signature available'}
          </div>
        </div>
      </div>
    </div>
  `;
}

async function printAllApplications(type) {
  // Fetch all applications of the given type
  const response = await fetch(`/api/admin/${type}`);
  const apps = await response.json();

  let printSection = document.getElementById('print-view-section');
  if (!printSection) {
    printSection = document.createElement('div');
    printSection.id = 'print-view-section';
    document.body.appendChild(printSection);
  }
  printSection.innerHTML = '';
  apps.forEach(app => {
    printSection.innerHTML += renderIdCardHTML(app, type);
  });

  // Show print section, hide main admin content
  printSection.style.display = 'block';
  document.querySelector('.admin-content').style.display = 'none';

  // Add a print and back button
  const btnBar = document.createElement('div');
  btnBar.style.textAlign = 'center';
  btnBar.style.margin = '20px';
  btnBar.innerHTML = `<button onclick="window.print()">Print</button> <button onclick="hidePrintSection()">Back</button>`;
  printSection.prepend(btnBar);
}

function hidePrintSection() {
  document.getElementById('print-view-section').style.display = 'none';
  document.querySelector('.admin-content').style.display = 'block';
}