// Dynamic API URL - works for both local development and production
const API = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api' 
  : `${window.location.protocol}//${window.location.host}/api`;
const user = JSON.parse(localStorage.getItem('user'));
const selectedSeatIds = new Set();
let undoTimer;

// ✅ Check authentication when page loads (but allow time for user data to be set)
function checkAuthentication() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || !user.id) {
    // Only redirect if we're not on the login page already and we've waited a bit
    if (!window.location.href.includes('index.html') && !window.location.href.includes('register.html')) {
      setTimeout(() => {
        const userCheck = JSON.parse(localStorage.getItem('user'));
        if (!userCheck || !userCheck.id) {
          alert("Please log in first.");
          window.location.href = "index.html";
        }
      }, 1000); // Wait 1 second for user data to be set
    }
  }
}

// Call authentication check
checkAuthentication();

// Logout
function logout() {
  localStorage.clear();
  window.location.href = 'index.html';
}

// Load Manual Seat Map
function loadManualSeats() {
  const floor = document.getElementById("floorSelect").value;
  const date = document.getElementById("manualDate").value;
  const seatMap = document.getElementById("seatMap");
  seatMap.innerHTML = "";

  if (!floor || !date) {
    alert("Please select floor and date.");
    return;
  }

  // ✅ Add user check before making API call
  if (!user || !user.id) {
    alert("Please log in first.");
    window.location.href = "index.html";
    return;
  }

  fetch(`${API}/intern/manual-seats?floor=${encodeURIComponent(floor)}&userId=${user.id}&date=${date}`)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return res.json();
    })
    .then(data => {
      const rowGroups = {};
      data.forEach(seat => {
        const rowKey = seat.seat_number?.charAt(0) || "X";
        if (!rowGroups[rowKey]) rowGroups[rowKey] = [];
        rowGroups[rowKey].push(seat);
      });

      Object.keys(rowGroups).sort().forEach(row => {
        const rowEl = document.createElement("div");
        rowEl.className = "seat-row";

        rowGroups[row].forEach(seat => {
          const div = document.createElement("div");
          div.className = "seat";
          div.textContent = seat.seat_number;
          div.dataset.id = seat.id;

          if (seat.bookedByMe) {
            div.classList.add("registered-by-you");
          } else if (seat.booked) {
            div.classList.add("booked");
          } else {
            div.classList.add("available");
            div.onclick = () => toggleSeat(div);
          }

          rowEl.appendChild(div);
        });

        seatMap.appendChild(rowEl);
      });
    })
    .catch(err => {
      console.error("Failed to load manual seats:", err);
      alert("Something went wrong loading seat data.");
    });
}

// Toggle Seat Selection
function toggleSeat(el) {
  const id = el.dataset.id;
  if (el.classList.contains("selected")) {
    el.classList.remove("selected");
    selectedSeatIds.delete(id);
  } else {
    el.classList.add("selected");
    selectedSeatIds.add(id);
  }
}

// Reserve Single Seat (from dropdown)
function reserveSeat() {
  // ✅ Add user check before making API call
  if (!user || !user.id) {
    alert("Please log in first.");
    window.location.href = "index.html";
    return;
  }

  const seatId = document.getElementById("seatSelect").value;
  const date = document.getElementById("seatDate").value;
  const startTime = document.getElementById("startTime").value;
  const endTime = document.getElementById("endTime").value;

  if (!seatId || !date || !startTime || !endTime) {
    alert("Please fill all fields.");
    return;
  }

  fetch(`${API}/intern/reserve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ internId: user.id, seatId, date, startTime, endTime })
  })
  .then(res => {
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  })
  .then(data => {
    alert(data.message);
    if (typeof loadMyReservations === 'function') {
      loadMyReservations();
    }
  })
  .catch(err => {
    console.error("Reservation error:", err);
    alert(`Failed to reserve seat: ${err.message}`);
  });
}

// Load Available Seats (dropdown)
function loadAvailableSeats() {
  const floor = document.getElementById("floorSelect").value;
  const date = document.getElementById("seatDate").value;
  const start = document.getElementById("startTime").value;
  const end = document.getElementById("endTime").value;

  if (!floor || !date || !start || !end) {
    alert("Please fill all fields.");
    return;
  }

  fetch(`${API}/intern/seats/available?floor=${encodeURIComponent(floor)}&date=${date}&start=${start}&end=${end}`)
    .then(res => res.json())
    .then(data => {
      const seatSelect = document.getElementById("seatSelect");
      seatSelect.innerHTML = "";

      if (data.length === 0) {
        const opt = document.createElement("option");
        opt.textContent = "No seats available";
        opt.disabled = true;
        seatSelect.appendChild(opt);
        return;
      }

      data.forEach(seat => {
        const opt = document.createElement("option");
        opt.value = seat.id;
        opt.textContent = seat.seat_number;
        seatSelect.appendChild(opt);
      });
    });
}

// Load My Reservations
async function loadMyReservations() {
  // ✅ Add user check before making API call
  if (!user || !user.id) {
    alert("Please log in first.");
    window.location.href = "index.html";
    return;
  }

  const list = document.getElementById("reservationList");
  if (!list) return;
  
  try {
    const res = await fetch(`${API}/intern/my-reservations/${user.id}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    list.innerHTML = "";

    const now = new Date();

    data.forEach(r => {
    const item = document.createElement("div");
    item.className = "card reservation-item";

    const header = document.createElement("div");
    header.className = "card-header";
    header.innerHTML = `
      <h3>${r.seat_number}</h3>
      <span class="badge">${r.status}</span>
    `;

    const details = document.createElement("div");
    details.className = "card-details";
    details.innerHTML = `
      <p><strong>Date:</strong> ${r.date}</p>
      <p><strong>Time:</strong> ${r.start_time} - ${r.end_time}</p>
      <p><strong>Floor:</strong> ${r.location}</p>
    `;

    item.appendChild(header);
    item.appendChild(details);

    const startTime = new Date(`${r.date}T${r.start_time}`);
    if (r.status === "active" && startTime > now) {
      const btnGroup = document.createElement("div");
      btnGroup.className = "btn-group";

      const editBtn = document.createElement("button");
      editBtn.className = "edit-btn";
      editBtn.textContent = "Edit";
      editBtn.onclick = () => openEditPopup(r);

      const cancelBtn = document.createElement("button");
      cancelBtn.className = "cancel-btn";
      cancelBtn.textContent = "Delete";
      cancelBtn.onclick = () => showUndoPopup(r.id);

      btnGroup.appendChild(editBtn);
      btnGroup.appendChild(cancelBtn);
      item.appendChild(btnGroup);
    }

    list.appendChild(item);
    });
  } catch (error) {
    console.error("Failed to load reservations:", error);
    list.innerHTML = `<p class='error-message'>Failed to load reservations: ${error.message}</p>`;
  }
}

// Open Edit Popup
function openEditPopup(r) {
  document.getElementById("editReservationId").value = r.id;
  document.getElementById("editSeatId").value = r.seat_id;
  document.getElementById("editDate").value = r.date;
  document.getElementById("editStartTime").value = r.start_time.slice(0, 5);
  document.getElementById("editEndTime").value = r.end_time.slice(0, 5);
  document.getElementById("editPopup").style.display = "block";
}

// Cancel Edit
function cancelEdit() {
  document.getElementById("editPopup").style.display = "none";
}

// Save Edit
document.getElementById("editForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("editReservationId").value;
  const seatId = document.getElementById("editSeatId").value;
  const date = document.getElementById("editDate").value;
  const startTime = document.getElementById("editStartTime").value;
  const endTime = document.getElementById("editEndTime").value;

  const res = await fetch(`${API}/intern/edit`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seatId, date, startTime, endTime, id })
  });

  const data = await res.json();
  alert(data.message);
  cancelEdit();
  loadMyReservations();
});

// Show Undo Popup
function showUndoPopup(id) {
  const popup = document.getElementById("cancelPopup");
  popup.style.display = "block";

  let secondsLeft = 10;
  document.getElementById("undoTimer").innerText = secondsLeft;

  undoTimer = setInterval(() => {
    secondsLeft--;
    document.getElementById("undoTimer").innerText = secondsLeft;
    if (secondsLeft <= 0) {
      clearInterval(undoTimer);
      popup.style.display = "none";
      finalizeCancel(id);
    }
  }, 1000);
}

// Cancel Undo
function cancelUndo() {
  clearInterval(undoTimer);
  document.getElementById("cancelPopup").style.display = "none";
  alert("Undo successful. Reservation not cancelled.");
}

// Finalize Cancellation
async function finalizeCancel(id) {
  await fetch(`${API}/intern/cancel/${id}`, { method: "DELETE" });
  loadMyReservations();
}

// ✅ FIXED Manual Booking Submit Handler
document.getElementById("popupBookingForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const seatIds = Array.from(selectedSeatIds);
  const date = document.getElementById("popupDate").value;
  const startTime = document.getElementById("popupStart").value;
  const endTime = document.getElementById("popupEnd").value;

  if (!date || !startTime || !endTime) {
    alert("Please fill all details.");
    return;
  }

  try {
    for (let seatId of seatIds) {
      await fetch(`${API}/intern/reserve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internId: user.id, seatId, date, startTime, endTime })
      });

      const el = document.querySelector(`.seat[data-id='${seatId}']`);
      if (el) {
        el.classList.remove("selected", "available");
        el.classList.add("registered-by-you");
        el.onclick = null;
      }
    }

    alert("Reservation successful!");
    selectedSeatIds.clear();
    closePopup();

    if (document.getElementById("reservationList")) {
      loadMyReservations();
    }

    loadManualSeats();
  } catch (err) {
    console.error("Reservation error:", err);
    alert("Something went wrong while reserving seats.");
  }
});
function downloadMyCSV() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user.id) {
    alert("Please log in first.");
    return;
  }
  window.open(`${API}/intern/my-reservations/export/${user.id}`, '_blank');
}

function downloadMyPDF() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user.id) {
    alert("Please log in first.");
    return;
  }
  window.open(`${API}/intern/my-reservations/export/pdf/${user.id}`, '_blank');
}

// ✅ Open booking popup for manual booking
function openBookingPopup() {
  if (selectedSeatIds.size === 0) {
    alert("Please select at least one seat first.");
    return;
  }
  document.getElementById("bookingPopup").style.display = "block";
}

// ✅ Close booking popup
function closePopup() {
  document.getElementById("bookingPopup").style.display = "none";
  // Clear form
  document.getElementById("popupDate").value = "";
  document.getElementById("popupStart").value = "";
  document.getElementById("popupEnd").value = "";
}

// ✅ Close popup when clicking outside
window.onclick = function(event) {
  const popup = document.getElementById("bookingPopup");
  const editPopup = document.getElementById("editPopup");
  const cancelPopup = document.getElementById("cancelPopup");
  
  if (event.target == popup) {
    closePopup();
  }
  if (event.target == editPopup) {
    cancelEdit();
  }
  if (event.target == cancelPopup) {
    cancelUndo();
  }
}