function openTab(tabId) {
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  
  // Remove active class from all tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab content
  document.getElementById(tabId).style.display = 'block';
  
  // Add active class to clicked button
  event.currentTarget.classList.add('active');
}

// Gazetted status form submission
// DEMO MODE: Always show demo data

document.getElementById('gazStatusForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const resultDiv = document.getElementById('gazStatusResult');
  resultDiv.innerHTML = '<p>Loading...</p>';

  // UPDATED DEMO DATA
  const app = {
    _id: '685b94c738f2c6bd0c668396',
    userId: 'user-f5ulgj56y',
    name: 'Sekhar Parida',
    empNo: '8260',
    designation: 'Engineer',
    department: 'OPERATING',
    station: 'Bhubaneswar',
    billUnit: '3101287',
    dob: '2025-06-17',
    mobile: '08260960591',
    address: 'Rashant Parida / At-Jagati,Po-Bhutamundai,Paradeep,754141',
    reason: 'jjgj',
    emergencyContactName: 'admin',
    emergencyContactNumber: '08763006266',
    family: [],
    photo: 'photo-1750832327133-333154072.png',
    sign: 'sign-1750832327147-237280960.jpg',
    status: 'Approved',
    createdAt: '2025-06-25T06:18:47.150+00:00',
    __v: 0,
    approvedAt: '2025-06-26T09:36:31.156+00:00'
  };
  let html = `
    <div class="status-details">
      <h4>Application Details</h4>
      <table>
        <tr><th>Application ID:</th><td>${app._id}</td></tr>
        <tr><th>Name:</th><td>${app.name}</td></tr>
        <tr><th>Employee No:</th><td>${app.empNo}</td></tr>
        <tr><th>Designation:</th><td>${app.designation}</td></tr>
        <tr><th>Department:</th><td>${app.department}</td></tr>
        <tr><th>Station:</th><td>${app.station}</td></tr>
        <tr><th>Bill Unit:</th><td>${app.billUnit}</td></tr>
        <tr><th>Date of Birth:</th><td>${app.dob}</td></tr>
        <tr><th>Mobile:</th><td>${app.mobile}</td></tr>
        <tr><th>Address:</th><td>${app.address}</td></tr>
        <tr><th>Emergency Contact:</th><td>${app.emergencyContactName} (${app.emergencyContactNumber})</td></tr>
        <tr><th>Status:</th><td>${app.status}</td></tr>
        <tr><th>Submitted On:</th><td>${new Date(app.createdAt).toLocaleString()}</td></tr>
        <tr><th>Approved At:</th><td>${app.approvedAt ? new Date(app.approvedAt).toLocaleString() : 'N/A'}</td></tr>
      </table>
      <div class="photo-preview">
        <h5>Photo:</h5>
        <img src="/uploads/${app.photo}" alt="Applicant Photo">
      </div>
      <div class="photo-preview">
        <h5>Signature:</h5>
        <img src="/uploads/${app.sign}" alt="Applicant Signature">
      </div>
      <div class="qr-code-container">
        <h4>QR Code</h4>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(app._id)}" alt="QR Code">
      </div>
      <h4 style="margin-top:20px;color:#1976d2;">Family Members</h4>
      <table class="family-table">
        <thead>
          <tr><th>Name</th><th>Blood Group</th><th>Relationship</th><th>DOB</th><th>Identification mark(s)</th></tr>
        </thead>
        <tbody>
          ${app.family.length === 0 ? '<tr><td colspan="5">No family members</td></tr>' : app.family.map(f => `<tr><td>${f.name}</td><td>${f.bloodGroup}</td><td>${f.relationship}</td><td>${f.dob}</td><td>${f.identificationMark}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
  resultDiv.innerHTML = html;
});

// Non-Gazetted status form submission
// DEMO MODE: Always show demo data

document.getElementById('nonGazStatusForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const resultDiv = document.getElementById('nonGazStatusResult');
  resultDiv.innerHTML = '<p>Loading...</p>';

  // UPDATED DEMO DATA (same as above)
  const app = {
    _id: '685b94c738f2c6bd0c668396',
    userId: 'user-f5ulgj56y',
    name: 'Sekhar Parida',
    empNo: '8260',
    designation: 'Engineer',
    department: 'OPERATING',
    station: 'Bhubaneswar',
    billUnit: '3101287',
    dob: '2025-06-17',
    mobile: '08260960591',
    address: 'Rashant Parida / At-Jagati,Po-Bhutamundai,Paradeep,754141',
    reason: 'jjgj',
    emergencyContactName: 'admin',
    emergencyContactNumber: '08763006266',
    family: [],
    photo: 'photo-1750832327133-333154072.png',
    sign: 'sign-1750832327147-237280960.jpg',
    status: 'Approved',
    createdAt: '2025-06-25T06:18:47.150+00:00',
    __v: 0,
    approvedAt: '2025-06-26T09:36:31.156+00:00'
  };
  let html = `
    <div class="status-details">
      <h4>Application Details</h4>
      <table>
        <tr><th>Application ID:</th><td>${app._id}</td></tr>
        <tr><th>Name:</th><td>${app.name}</td></tr>
        <tr><th>Employee No:</th><td>${app.empNo}</td></tr>
        <tr><th>Designation:</th><td>${app.designation}</td></tr>
        <tr><th>Department:</th><td>${app.department}</td></tr>
        <tr><th>Station:</th><td>${app.station}</td></tr>
        <tr><th>Bill Unit:</th><td>${app.billUnit}</td></tr>
        <tr><th>Date of Birth:</th><td>${app.dob}</td></tr>
        <tr><th>Mobile:</th><td>${app.mobile}</td></tr>
        <tr><th>Address:</th><td>${app.address}</td></tr>
        <tr><th>Emergency Contact:</th><td>${app.emergencyContactName} (${app.emergencyContactNumber})</td></tr>
        <tr><th>Status:</th><td>${app.status}</td></tr>
        <tr><th>Submitted On:</th><td>${new Date(app.createdAt).toLocaleString()}</td></tr>
        <tr><th>Approved At:</th><td>${app.approvedAt ? new Date(app.approvedAt).toLocaleString() : 'N/A'}</td></tr>
      </table>
      <div class="photo-preview">
        <h5>Photo:</h5>
        <img src="/uploads/${app.photo}" alt="Applicant Photo">
      </div>
      <div class="photo-preview">
        <h5>Signature:</h5>
        <img src="/uploads/${app.sign}" alt="Applicant Signature">
      </div>
      <div class="qr-code-container">
        <h4>QR Code</h4>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(app._id)}" alt="QR Code">
      </div>
      <h4 style="margin-top:20px;color:#1976d2;">Family Members</h4>
      <table class="family-table">
        <thead>
          <tr><th>Name</th><th>Blood Group</th><th>Relationship</th><th>DOB</th><th>Identification mark(s)</th></tr>
        </thead>
        <tbody>
          ${app.family.length === 0 ? '<tr><td colspan="5">No family members</td></tr>' : app.family.map(f => `<tr><td>${f.name}</td><td>${f.bloodGroup}</td><td>${f.relationship}</td><td>${f.dob}</td><td>${f.identificationMark}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
  resultDiv.innerHTML = html;
});