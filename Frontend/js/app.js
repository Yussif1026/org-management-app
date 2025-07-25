const API_BASE = "https://org-management-app-backend.onrender.com/api";

// --- AUTH LOGIC ---

// Register User
async function register() {
    const fullname = document.getElementById('register-fullname').value;
    const email = document.getElementById('register-email').value;
    const phone = document.getElementById('register-phone').value;
    const password = document.getElementById('register-password').value;

    if (!fullname || !email || !password) {
        alert('Please fill in all required fields');
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fullname, email, phone, password })
        });
        const data = await res.json();
        if (res.ok) {
            alert("Registration successful! Please log in.");
            document.getElementById('register-fullname').value = '';
            document.getElementById('register-email').value = '';
            document.getElementById('register-phone').value = '';
            document.getElementById('register-password').value = '';
        } else {
            alert(data.msg || "Registration failed.");
        }
    } catch (err) {
        alert("Error connecting to server.");
    }
}

// Login User
async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    if (!email || !password) {
        alert("Please enter email and password");
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok && data.token) {
            localStorage.setItem("token", data.token);
            alert(`Welcome back, ${data.user.fullname}!`);
            window.location.reload();
        } else {
            alert(data.msg || "Login failed.");
        }
    } catch (err) {
        alert("Error connecting to server.");
    }
}

function logout() {
    localStorage.removeItem("token");
    window.location.reload();
}

// --- ON LOAD: Check login, update UI, fetch profile, payments, events ---
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (token) {
        showDashboard();
    } else {
        showAuthForms();
    }
    // Allow pressing Enter to submit login/register
    ["login-password", "register-password"].forEach(id => {
        document.getElementById(id).addEventListener("keydown", function(e) {
            if (e.key === "Enter") {
                if (id === "login-password") login();
                if (id === "register-password") register();
            }
        });
    });
});

// Show/hide sections based on login state
function showDashboard() {
    document.getElementById('register-section').classList.add('hidden');
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('logout-btn').classList.remove('hidden');
    document.getElementById('member-section').classList.remove('hidden');
    fetchProfile();
    fetchPayments();
    fetchEvents();
    fetchMembers();
}

function showAuthForms() {
    document.getElementById('register-section').classList.remove('hidden');
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('logout-btn').classList.add('hidden');
    document.getElementById('member-section').classList.add('hidden');
    document.getElementById('admin-sections').classList.add('hidden');
}

// --- Fetch Profile Info ---
async function fetchProfile() {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`${API_BASE}/auth/profile`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('member-name').textContent = data.fullname;
            renderProfileInfo(data);
            if (data.isAdmin) {
                document.getElementById('admin-sections').classList.remove('hidden');
                fetchMembers();
                fetchAllPaymentsForAdmin(); // Fetch all payment transactions for admin
            } else {
                document.getElementById('admin-sections').classList.add('hidden');
            }
        } else {
            alert("Session expired, please log in again.");
            logout();
        }
    } catch (err) {
        alert("Error fetching profile.");
    }
}

function renderProfileInfo(user) {
    document.getElementById('profile-info').innerHTML = `
        <div class="bg-gray-50 p-3 rounded-lg"><h4 class="font-medium text-gray-700">Full Name</h4><p class="text-gray-900">${user.fullname}</p></div>
        <div class="bg-gray-50 p-3 rounded-lg"><h4 class="font-medium text-gray-700">Email</h4><p class="text-gray-900">${user.email}</p></div>
        <div class="bg-gray-50 p-3 rounded-lg"><h4 class="font-medium text-gray-700">Phone</h4><p class="text-gray-900">${user.phone || 'Not provided'}</p></div>
        <div class="bg-gray-50 p-3 rounded-lg"><h4 class="font-medium text-gray-700">Member Since</h4><p class="text-gray-900">${(user.joinDate || "").slice(0,10)}</p></div>
        <div class="bg-gray-50 p-3 rounded-lg"><h4 class="font-medium text-gray-700">Account Type</h4><p class="text-gray-900">${user.isAdmin ? 'Admin' : 'Regular Member'}</p></div>
    `;
}

// --- Payments (History + Summary) ---
async function fetchPayments() {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`${API_BASE}/payments/history`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const payments = await res.json();
        if (res.ok) {
            renderPaymentHistory(payments);
            renderPaymentSummary(payments);
        }
    } catch (err) {
        alert("Error fetching payments.");
    }
}

function renderPaymentHistory(payments) {
    const tbody = document.querySelector("#history-table tbody");
    tbody.innerHTML = '';
    if (!payments.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No payment history yet</td></tr>`;
        return;
    }
    payments.forEach(payment => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                ${payment.type === 'monthly' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}">
                ${payment.type === 'monthly' ? 'Monthly' : 'Occasion'}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-900">${payment.amount}</td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-900">${payment.eventType ? formatEventType(payment.eventType) : 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-900">${(payment.date || '').slice(0,10)}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderPaymentSummary(payments) {
    const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const monthlyPayments = payments.filter(p => p.type === 'monthly').length * 20;
    const occasionPayments = payments.filter(p => p.type === 'occasion').length * 50;
    document.getElementById('totals').innerHTML = `
        <div class="bg-green-50 p-4 rounded-lg mb-3">
            <h4 class="font-medium text-green-800">Total Contributions</h4>
            <p class="text-2xl font-bold text-green-900">GHC ${totalPayments}</p>
        </div>
        <div class="bg-blue-50 p-4 rounded-lg mb-3">
            <h4 class="font-medium text-blue-800">Monthly Payments</h4>
            <p class="text-2xl font-bold text-blue-900">GHC ${monthlyPayments}</p>
        </div>
        <div class="bg-purple-50 p-4 rounded-lg">
            <h4 class="font-medium text-purple-800">Occasion Payments</h4>
            <p class="text-2xl font-bold text-purple-900">GHC ${occasionPayments}</p>
        </div>
    `;
    // Show total in big text (in summary card)
    if (document.getElementById('total-contributions')) {
        document.getElementById('total-contributions').textContent = `GHC ${totalPayments}`;
    }
}

// --- Make Payments (call API and redirect to Paystack) ---
async function payMonthly() {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`${API_BASE}/payments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ type: "monthly" })
        });
        const data = await res.json();
        if (res.ok && (data.url || data.authorization_url)) {
            window.location.href = data.url || data.authorization_url;
        } else {
            alert(data.msg || 'Payment could not be initialized.');
        }
    } catch (err) {
        alert("Error connecting to payment gateway.");
    }
}

async function payOccasion() {
    const token = localStorage.getItem("token");
    const occasionType = document.getElementById('occasion-type').value;
    try {
        const res = await fetch(`${API_BASE}/payments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ type: "occasion", eventType: occasionType })
        });
        const data = await res.json();
        if (res.ok && (data.url || data.authorization_url)) {
            window.location.href = data.url || data.authorization_url;
        } else {
            alert(data.msg || 'Payment could not be initialized.');
        }
    } catch (err) {
        alert("Error connecting to payment gateway.");
    }
}

// --- Events (Announcements & Admins) ---
async function fetchEvents() {
    try {
        const res = await fetch(`${API_BASE}/events`);
        const events = await res.json();
        if (res.ok) {
            renderEvents(events);
        }
    } catch (err) {
        // Just silently ignore errors
    }
}

function renderEvents(events) {
    const eventsList = document.getElementById('events-list');
    eventsList.innerHTML = '';
    if (!events.length) {
        eventsList.innerHTML = '<li class="text-gray-500">No events or announcements yet</li>';
        return;
    }
    events.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(event => {
        const eventItem = document.createElement('li');
        eventItem.className = 'border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-all';
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        eventItem.innerHTML = `
            <div class="flex items-start">
                <div class="flex-shrink-0 mt-1">
                    <span class="inline-flex items-center justify-center h-8 w-8 rounded-full ${getEventColorClass(event.type)}">
                        <i class="${getEventIcon(event.type)} text-white text-sm"></i>
                    </span>
                </div>
                <div class="ml-3">
                    <h3 class="text-lg font-medium text-gray-900">${event.title}</h3>
                    <p class="text-sm text-gray-500 mb-2">${formattedDate}</p>
                    <p class="text-gray-700">${event.description}</p>
                    <span class="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium 
                        ${getEventColorClass(event.type)} text-white">
                        ${formatEventType(event.type)}
                    </span>
                </div>
            </div>
        `;
        eventsList.appendChild(eventItem);
    });
}

// --- Admin Section: Members list & Create Event ---
async function fetchMembers() {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`${API_BASE}/auth/members`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const users = await res.json();
        if (res.ok) {
            renderMembers(users);
        }
    } catch (err) {}
}

function renderMembers(users) {
    const membersTableBody = document.querySelector("#members-table tbody");
    membersTableBody.innerHTML = '';
    users.forEach(user => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                        <span class="inline-flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100">
                            <i class="fas fa-user text-indigo-600"></i>
                        </span>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${user.fullname}</div>
                        <div class="text-sm text-gray-500">${user.isAdmin ? 'Admin' : 'Member'}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.email}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.phone || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(user.joinDate || '').slice(0,10)}</td>
        `;
        membersTableBody.appendChild(row);
    });
}

// Admin: Create New Event (for admin panel)
async function adminCreateEvent() {
    const token = localStorage.getItem("token");
    const title = document.getElementById('event-title').value;
    const description = document.getElementById('event-description').value;
    const type = document.getElementById('event-type').value;
    const date = document.getElementById('event-date').value;

    if (!title || !description || !type || !date) {
        alert('Please fill in all fields');
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ title, description, type, date })
        });
        const data = await res.json();
        if (res.ok) {
            alert("Event created successfully!");
            document.getElementById('event-title').value = '';
            document.getElementById('event-description').value = '';
            document.getElementById('event-type').value = 'naming';
            document.getElementById('event-date').value = '';
            fetchEvents();
        } else {
            alert(data.msg || "Failed to create event.");
        }
    } catch (err) {
        alert("Error creating event.");
    }
}

// --- ADMIN: ALL Payment History Table (requires backend endpoint /auth/members with all payment info)
async function fetchAllPaymentsForAdmin() {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`${API_BASE}/auth/members`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const users = await res.json();
        if (res.ok && Array.isArray(users)) {
            renderAdminPaymentHistory(users);
        }
    } catch (err) {
        // ignore
    }
}

// Render all payment history (admin only)
function renderAdminPaymentHistory(users) {
    const tbody = document.querySelector("#admin-history-table tbody");
    if (!tbody) return;
    tbody.innerHTML = '';
    let hasPayments = false;
    users.forEach(user => {
        if (user.payments && user.payments.length) {
            user.payments.forEach(payment => {
                hasPayments = true;
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50';
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">${user.fullname || ''}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${user.email || ''}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${user.phone || ''}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${payment.type === 'monthly' ? 'Monthly' : 'Occasion'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${payment.amount}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${payment.eventType ? formatEventType(payment.eventType) : 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${(payment.date || '').slice(0,10)}</td>
                `;
                tbody.appendChild(row);
            });
        }
    });
    if (!hasPayments) {
        tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">No payment history yet</td></tr>`;
    }
}

// --- Helpers ---
function formatEventType(type) {
    const types = {
        naming: "Naming Ceremony",
        engagement: "Engagement",
        wedding: "Wedding",
        paternal_funeral: "Paternal Funeral",
        maternal_funeral: "Maternal Funeral",
        critical_funeral: "Critical Funeral",
        announcement: "Announcement"
    };
    return types[type] || type;
}
function getEventColorClass(type) {
    const colors = {
        naming: "bg-blue-500",
        engagement: "bg-purple-500",
        wedding: "bg-pink-500",
        paternal_funeral: "bg-gray-500",
        maternal_funeral: "bg-gray-600",
        critical_funeral: "bg-gray-700",
        announcement: "bg-indigo-500"
    };
    return colors[type] || "bg-indigo-500";
}
function getEventIcon(type) {
    const icons = {
        naming: "fas fa-baby",
        engagement: "fas fa-ring",
        wedding: "fas fa-heart",
        paternal_funeral: "fas fa-cross",
        maternal_funeral: "fas fa-cross",
        critical_funeral: "fas fa-cross",
        announcement: "fas fa-bullhorn"
    };
    return icons[type] || "fas fa-calendar-alt";
}
