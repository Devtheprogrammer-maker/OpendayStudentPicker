import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, update, onValue, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyA-HubEYcFzDOGg3m4E2rJi00xjhNxf7Hg",
  authDomain: "openday-ea15c.firebaseapp.com",
  databaseURL: "https://openday-ea15c-default-rtdb.firebaseio.com",
  projectId: "openday-ea15c",
  storageBucket: "openday-ea15c.firebasestorage.app",
  messagingSenderId: "777502812780",
  appId: "1:777502812780:web:8c4d1972ae97ad89680649"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// The master list of Category Names
const areaNames = [
  "Religion", "Spanish", "Tourism", "Integrated Science", "Biology", "Chemistry",
  "Agri - Tilapia", "Agri - Piggery", "Agri - Vegetable", "Agri - Cattle Ranch",
  "Agri - Layers", "Agri - Broilers", "Agri - Green house", "Agri - Implements",
  "IT", "Belizean/Social Studies", "General Business", "English", "Literature",
  "Math", "PE", "Tokens/Helpers", "Tour Guides", "Planning Committee", "Peer Helpers", "Sales"
];

const studentsRef = ref(db, '/');
let masterStudentList = [];
let currentlyClaimedNames = [];

onValue(ref(db, '/'), (snapshot) => {
  const data = snapshot.val();
  // Filter out the 'activities' node so we only have the student array
  masterStudentList = Object.values(data).filter(item => item["First Name"]);

  // Also get the activities to see who is already taken
  if (data.activities) {
    calculateRemaining(data.activities);
    renderAreas(data.activities);
  }
});

// 3. Logic to see who is left
function calculateRemaining(activities) {
  currentlyClaimedNames = [];

  // Flatten all names currently in activity slots
  Object.values(activities).forEach(area => {
    Object.keys(area).forEach(key => {
      if (key !== "slotCount") {
        currentlyClaimedNames.push(area[key].toLowerCase().trim());
      }
    });
  });

  const remainingContainer = document.getElementById('remaining-students');
  if (!remainingContainer) return;

  // Filter master list against claimed names
  const left = masterStudentList.filter(s => {
    const fullName = `${s["First Name"]} ${s["Last Name"]}`.toLowerCase().trim();
    return !currentlyClaimedNames.includes(fullName);
  });

  remainingContainer.innerHTML = `<h3>Students Left (${left.length})</h3>`;
  const list = document.createElement('div');
  list.className = 'remaining-list';

  left.forEach(s => {
    list.innerHTML += `<span>[${s.Class}] ${s["First Name"]} ${s["Last Name"]}</span>`;
  });
  remainingContainer.appendChild(list);
}

onValue(ref(db, 'activities'), (snapshot) => {
  const data = snapshot.val() || {};
  renderAreas(data);
});

function renderAreas(data) {
  const container = document.getElementById('activity-container');
  if (!container) return;
  container.innerHTML = "";

  areaNames.forEach(name => {
    const areaData = data[name] || {};
    const slotCount = areaData.slotCount || 1;
    const teacher = areaData.teacherInCharge || "None assigned";

    const card = document.createElement('div');
    card.className = 'area-card';

    let slotsHtml = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h3 style="margin:0;">${name}</h3>
                <div style="font-size: 0.9em; color: #666; margin: 5px 0; cursor: pointer;" onclick="updateTeacher('${name}')">
                    <strong>Teacher:</strong> <span style="color: #007bff; text-decoration: underline;">${teacher}</span>
                </div>
                <div style="display:flex; gap: 5px; margin-top: 5px;">
                    <button class="btn-add" onclick="addSlot('${name}', ${slotCount})">+ Slot</button>
                    <button class="btn-remove" onclick="removeSlot('${name}', ${slotCount})">- Slot</button>
                </div>
            </div>
        `;

    for (let i = 1; i <= slotCount; i++) {
      const claim = areaData[i] || null;
      slotsHtml += `
                <div class="slot-row">
                    <span class="slot-num">#${i}</span>
                    ${claim
          ? `<div class="claimed-container">
                             <span class="claimed">${claim}</span>
                             <button onclick="clearSlot('${name}', ${i})" class="btn-clear">×</button>
                           </div>`
          : `<span class="available" onclick="claimSlot('${name}', ${i})">Assign Student</span>`
        }
                </div>`;
    }
    card.innerHTML = slotsHtml;
    container.appendChild(card);
  });
}

// Function to add a new slot to a specific area
window.addSlot = async function (name, currentCount) {
  const newCount = currentCount + 1;
  await update(ref(db, `activities/${name}`), {
    slotCount: newCount
  });
};

window.claimSlot = async function (areaName, slotId) {
  window.claimSlot = async function (areaName, slotId) {
    const nameInput = prompt(`Enter Student Name for ${areaName} Slot ${slotId}:`);
    if (!nameInput) return;

    const cleanName = nameInput.trim();
    const lowerName = cleanName.toLowerCase();

    // VALIDATION: Check if already in this or any other area
    if (currentlyClaimedNames.includes(lowerName)) {
      alert(`ERROR: ${cleanName} is already assigned to an activity!`);
      return;
    }

    // VALIDATION: Check if name actually exists in the school list
    const exists = masterStudentList.some(s =>
      `${s["First Name"]} ${s["Last Name"]}`.toLowerCase().trim() === lowerName
    );

    if (!exists) {
      if (!confirm(`Warning: "${cleanName}" was not found in the official student list. Assign anyway?`)) {
        return;
      }
    }

    await update(ref(db, `activities/${areaName}`), {
      [slotId]: cleanName
    });
  };
};

// Function to decrease the slot count and clean up the data
window.removeSlot = async function (name, currentCount) {
  if (currentCount <= 1) {
    alert("You must have at least one slot!");
    return;
  }

  if (confirm(`Are you sure you want to remove Slot #${currentCount} from ${name}?`)) {
    const newCount = currentCount - 1;
    const updates = {};

    // Update the count
    updates[`activities/${name}/slotCount`] = newCount;

    // Remove the data in the last slot (so it's empty if re-added)
    updates[`activities/${name}/${currentCount}`] = null;

    try {
      await update(ref(db), updates);
    } catch (err) {
      console.error("Remove failed:", err);
    }
  }
};

// Function to clear a student from a slot without deleting the slot itself
window.clearSlot = async function (areaName, slotId) {
  if (confirm(`Clear student from ${areaName} Slot #${slotId}?`)) {
    try {
      await update(ref(db, `activities/${areaName}`), {
        [slotId]: null
      });
      // This will automatically trigger the onValue listener 
      // and move the student back to the "Students Left" list.
    } catch (err) {
      console.error("Clear failed:", err);
    }
  }
};

window.updateTeacher = async function (areaName) {
  const teacherName = prompt(`Who is the teacher in-charge of ${areaName}?`);
  if (teacherName !== null) { // Allows clearing by leaving blank and clicking OK
    try {
      await update(ref(db, `activities/${areaName}`), {
        teacherInCharge: teacherName.trim()
      });
    } catch (err) {
      console.error("Teacher update failed:", err);
    }
  }
};

window.printList = function () {
  window.print();
};

// Search Filter (remains the same)
document.getElementById('activitySearch').addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  const cards = document.querySelectorAll('.area-card');
  cards.forEach(card => {
    const title = card.querySelector('h3').innerText.toLowerCase();
    card.style.display = title.includes(term) ? "block" : "none";
  });
});