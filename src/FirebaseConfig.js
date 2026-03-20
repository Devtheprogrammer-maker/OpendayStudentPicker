// 1. Corrected Imports from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getDatabase, ref, get, child, update, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 2. Your Firebase configuration (Hardcoded for today's deadline)
const firebaseConfig = {
  apiKey: "AIzaSyA-HubEYcFzDOGg3m4E2rJi00xjhNxf7Hg",
  authDomain: "openday-ea15c.firebaseapp.com",
  databaseURL: "https://openday-ea15c-default-rtdb.firebaseio.com",
  projectId: "openday-ea15c",
  storageBucket: "openday-ea15c.firebasestorage.app",
  messagingSenderId: "777502812780",
  appId: "1:777502812780:web:8c4d1972ae97ad89680649",
  measurementId: "G-L9B0FF31X9"
};

// 3. Initialize Services
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const analytics = getAnalytics(app);

// 4. Live Listener: Rebuilds the table automatically when data changes
const studentsRef = ref(db, '/');
onValue(studentsRef, (snapshot) => {
  const data = snapshot.val();
  if (data) {
    updateYourUITable(data);
  } else {
    console.log("Database is empty. Add some students in the Firebase console!");
  }
});

// 5. Function to update the HTML Table
function updateYourUITable(data) {
  const tableBody = document.getElementById('student-table-body');
  if (!tableBody) return;
  
  tableBody.innerHTML = ""; 

  for (let id in data) {
    const student = data[id];
    
    // 1. Combine First and Last Name since your JSON uses those keys
    // We also pull the Class for better identification
    const firstName = student["First Name"] || "";
    const lastName = student["Last Name"] || "";
    const studentClass = student["Class"] || "N/A";
    const fullName = `${firstName} ${lastName}`.trim();

    // 2. Handle the display name logic
    const displayName = fullName || "Unknown Student";
    const isClaimed = student.is_claimed || false;
    const assignedTo = student.assigned_to || "";

    const buttonDisabled = isClaimed ? "disabled" : "";
    const statusText = isClaimed ? `Claimed by ${assignedTo}` : "Available";

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>[${studentClass}]</strong> ${displayName}</td>
      <td>${statusText}</td>
      <td>
        <button onclick="handleClaim('${id}')" ${buttonDisabled}>
          ${isClaimed ? 'Taken' : 'Claim Student'}
        </button>
      </td>
    `;
    tableBody.appendChild(row);
  }
}

// 6. Action Function: Handles the actual claiming process
async function claimStudent(studentId, teacherName) {
  // Use the same path as your onValue listener (root or 'students')
  // If your students are at the root, use `ref(db, `/${studentId}`)`
  const studentRef = ref(db, `/${studentId}`); 
  
  try {
    const snapshot = await get(studentRef);
    const student = snapshot.val();

    console.log("Checking student data:", student); // Debug: See what Firebase sees

    // We check if student exists AND if is_claimed is specifically NOT true
    if (student && student.is_claimed !== true) {
      await update(studentRef, {
        is_claimed: true,
        assigned_to: teacherName
      });
      alert(`Success! ${student["First Name"]} is now claimed by ${teacherName}.`);
    } else {
      console.log("Claim failed. Student data:", student);
      alert("Too late! This student is already taken.");
    }
  } catch (error) {
    console.error("Update failed:", error);
    alert("Error claiming student. Check your Firebase rules!");
  }
}

// 7. Global Bridge: Allows HTML buttons to trigger the claim
window.handleClaim = function(id) {
  const teacherName = prompt("Please enter your name:");
  if (teacherName && teacherName.trim() !== "") {
    claimStudent(id, teacherName);
  }
};