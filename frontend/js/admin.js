// Dynamic API URL - works for both local development and production
const API = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api' 
  : `${window.location.protocol}//${window.location.host}/api`;

// ✅ Check if admin is logged in
const user = JSON.parse(localStorage.getItem('user'));
if (!user || !user.id || user.role !== 'admin') {
  alert("Admin access required. Please log in as an administrator.");
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  // Only load seat viewer if the elements exist (on seat viewer page)
  if (document.getElementById("viewFloor") && document.getElementById("adminSeatMap")) {
    // Set today's date as default
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById("viewDate").value = today;
    
    loadManualSeats();
    
    // Reload seats when floor or date changes
    document.getElementById("viewFloor").addEventListener("change", loadManualSeats);
    document.getElementById("viewDate").addEventListener("change", loadManualSeats);
  }

  // Handle Add Seat form
  document.getElementById("seatForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const seatNumber = document.getElementById("seatNumber").value.trim();
    const location = document.getElementById("location").value.trim();

    if (!seatNumber || !location) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const res = await fetch(`${API}/admin/seat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          seat_number: seatNumber, 
          location,
          adminEmail: user?.email 
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        alert(data.message);
        // Clear form on success
        document.getElementById("seatNumber").value = "";
        document.getElementById("location").value = "";
        loadManualSeats(); // refresh view
      } else {
        // Show specific error message from server
        alert(data.message || "Failed to add seat");
      }
    } catch (err) {
      console.error("Error adding seat:", err);
      alert("Failed to add seat. Please check your connection and try again.");
    }
  });
});

// ✅ Load Seats for Admin Seat Viewer with Enhanced Features
function loadManualSeats() {
  const floor = document.getElementById("viewFloor")?.value;
  const date = document.getElementById("viewDate")?.value;
  const map = document.getElementById("adminSeatMap");
  
  if (!map || !floor) {
    console.log("Missing floor or map element");
    return;
  }
  
  map.innerHTML = "<p>Loading seats...</p>";

  // Build URL with floor and date parameters
  let url = `${API}/admin/view-seats?floor=${encodeURIComponent(floor)}`;
  if (date) {
    url += `&date=${encodeURIComponent(date)}`;
  }

  // Fetch seats with booking details
  fetch(url)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return res.json();
    })
    .then(seats => {
      map.innerHTML = "";
      
      if (!seats || seats.length === 0) {
        map.innerHTML = "<p>No seats available for this floor.</p>";
        return;
      }

      // Sort seats by seat number for grid layout
      seats.sort((a, b) => {
        const aNum = parseInt(a.seat_number.slice(1));
        const bNum = parseInt(b.seat_number.slice(1));
        return aNum - bNum;
      });

      seats.forEach(seat => {
        const div = document.createElement("div");
        div.className = "seat";
        div.textContent = seat.seat_number;
        div.dataset.seatId = seat.id;

        // Check if seat is currently booked
        const now = new Date();
        const isCurrentlyBooked = seat.booked && seat.booking_details;
        
        if (isCurrentlyBooked) {
          // Check if booking time has passed
          const bookingDate = seat.booking_details.date;
          const endTime = seat.booking_details.end_time;
          const bookingEndDateTime = new Date(`${bookingDate}T${endTime}`);
          
          if (now > bookingEndDateTime) {
            // Booking time has passed, show as available
            div.classList.add("available");
          } else {
            // Currently booked, show in red
            div.classList.add("booked");
            div.onclick = () => showBookingDetails(seat);
          }
        } else {
          div.classList.add("available");
        }

        map.appendChild(div);
      });
    })
    .catch(err => {
      console.error("Failed to load seat map:", err);
      map.innerHTML = `<p>Error loading seat data: ${err.message}</p>`;
    });
}

// ✅ Show Booking Details Popup
function showBookingDetails(seat) {
  const popup = document.getElementById('bookingPopup');
  const detailsDiv = document.getElementById('bookingDetails');
  
  const booking = seat.booking_details;
  const now = new Date();
  const startDateTime = new Date(`${booking.date}T${booking.start_time}`);
  const endDateTime = new Date(`${booking.date}T${booking.end_time}`);
  
  let statusText = "Active";
  let statusColor = "#22c55e";
  
  if (now < startDateTime) {
    statusText = "Upcoming";
    statusColor = "#f59e0b";
  } else if (now > endDateTime) {
    statusText = "Completed";
    statusColor = "#6b7280";
  }
  
  detailsDiv.innerHTML = `
    <p><strong>Seat:</strong> ${seat.seat_number}</p>
    <p><strong>Intern Name:</strong> ${booking.intern_name}</p>
    <p><strong>Date:</strong> ${booking.date}</p>
    <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
    <p><strong>Floor:</strong> ${seat.location}</p>
    <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
    <p><strong>Booked At:</strong> ${new Date(booking.created_at).toLocaleString()}</p>
  `;
  
  popup.style.display = 'flex';
}

// ✅ Close Booking Details Popup
function closeBookingPopup() {
  document.getElementById('bookingPopup').style.display = 'none';
}

// ✅ Close popup when clicking outside
window.onclick = function(event) {
  const popup = document.getElementById('bookingPopup');
  if (event.target === popup) {
    closeBookingPopup();
  }
}

// ✅ Export CSV
function downloadCSV() {
  window.open(`${API}/admin/export/csv`, '_blank');
}

// ✅ Export PDF
function downloadPDF() {
  window.open(`${API}/admin/export/pdf`, '_blank');
}