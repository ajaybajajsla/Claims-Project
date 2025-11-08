// Simple localStorage-based demo

function getUsers() {
  return JSON.parse(localStorage.getItem("users") || "[]");
}
function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}
function setSession(user) {
  localStorage.setItem("session", JSON.stringify(user));
}
function getSession() {
  return JSON.parse(localStorage.getItem("session") || "null");
}
function clearSession() {
  localStorage.removeItem("session");
}

// Registration
document.addEventListener("DOMContentLoaded", () => {
  const path = location.pathname.split("/").pop();

  if (path === "register.html") {
    document.getElementById("registerForm").addEventListener("submit", e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      let users = getUsers();
      if (users.find(u => u.email === data.email)) {
        alert("Email already registered");
        return;
      }
      users.push(data);
      saveUsers(users);
      alert("Registration successful!");
      location.href = "login.html";
    });
  }

  if (path === "login.html") {
    document.getElementById("loginForm").addEventListener("submit", e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      let users = getUsers();
      let user = users.find(u => u.email === data.email && u.password === data.password);
      if (!user) {
        alert("Invalid credentials");
        return;
      }
      setSession(user);
      location.href = "dashboard.html";
    });
  }

  if (path === "dashboard.html") {
    const session = getSession();
    if (!session) {
      alert("Please login first");
      location.href = "login.html";
      return;
    }
    document.getElementById("logoutBtn").addEventListener("click", () => {
      clearSession();
      location.href = "login.html";
    });

    const claimsList = document.getElementById("claimsList");
    const newBtn = document.getElementById("newClaimBtn");
    let claims = JSON.parse(localStorage.getItem("claims") || "[]");

    function renderClaims() {
      claimsList.innerHTML = claims.map(c => `<li>${c.title} - ${c.status}</li>`).join("");
    }
    renderClaims();

    newBtn.addEventListener("click", () => {
      const title = prompt("Enter claim title:");
      if (!title) return;
      const claim = { title, status: "Pending" };
      claims.push(claim);
      localStorage.setItem("claims", JSON.stringify(claims));
      renderClaims();
    });
  }
});
