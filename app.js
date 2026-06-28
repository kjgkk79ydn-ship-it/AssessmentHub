import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  updateDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Auth elements
const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const signUpBtn = document.getElementById("signUpBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authMessage = document.getElementById("authMessage");
const userPanel = document.getElementById("userPanel");
const userEmail = document.getElementById("userEmail");

// App elements
const taskForm = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");

const totalTasksEl = document.getElementById("totalTasks");
const completedTasksEl = document.getElementById("completedTasks");
const overdueTasksEl = document.getElementById("overdueTasks");
const dueThisWeekEl = document.getElementById("dueThisWeek");

const workloadWarning = document.getElementById("workloadWarning");

const subjectFilter = document.getElementById("subjectFilter");
const statusFilter = document.getElementById("statusFilter");
const sortDueDateBtn = document.getElementById("sortDueDate");

const subjectDropdown = document.getElementById("subject");
const electiveInput = document.getElementById("electiveInput");
const addElectiveBtn = document.getElementById("addElectiveBtn");
const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editForm");
const editSubject = document.getElementById("editSubject");
const editTaskName = document.getElementById("editTaskName");
const editDueDate = document.getElementById("editDueDate");
const editWeighting = document.getElementById("editWeighting");
const editPriority = document.getElementById("editPriority");
const editStatus = document.getElementById("editStatus");
const editNotes = document.getElementById("editNotes");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const usernameInput = document.getElementById("usernameInput");
const usernameDisplay = document.getElementById("usernameDisplay");
const saveUsernameBtn = document.getElementById("saveUsernameBtn");
const usernameMessage = document.getElementById("usernameMessage");
const newPasswordInput = document.getElementById("newPasswordInput");
const changePasswordBtn = document.getElementById("changePasswordBtn");
const passwordMessage = document.getElementById("passwordMessage");
const electivesList = document.getElementById("electivesList");
const settingsElectiveInput = document.getElementById("settingsElectiveInput");
const settingsAddElectiveBtn = document.getElementById("settingsAddElectiveBtn");
const settingsElectiveMessage = document.getElementById("settingsElectiveMessage");
const deleteAccountBtn = document.getElementById("deleteAccountBtn");
const deleteAccountMessage = document.getElementById("deleteAccountMessage");
const electiveMessage = document.getElementById("electiveMessage");

let currentUser = null;
let tasks = [];
let electives = [];
let unsubscribeTasks = null;
let unsubscribeElectives = null;
let editingTaskId = null;

const DEFAULT_SUBJECTS = ["Mathematics", "English", "Science", "Geography", "History", "PDHPE"];

let subjectChart;
let statusChart;

// ---------- ACCOUNT FUNCTIONS ----------

signUpBtn.addEventListener("click", async function () {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (email === "" || password === "") {
    authMessage.textContent = "Please enter an email and password.";
    authMessage.style.color = "#dc2626";
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    authMessage.textContent = "Account created successfully.";
    authMessage.style.color = "#16a34a";
  } catch (error) {
    authMessage.textContent = error.message;
    authMessage.style.color = "#dc2626";
  }
});

loginBtn.addEventListener("click", async function () {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (email === "" || password === "") {
    authMessage.textContent = "Please enter an email and password.";
    authMessage.style.color = "#dc2626";
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    authMessage.textContent = "Logged in successfully.";
    authMessage.style.color = "#16a34a";
  } catch (error) {
    authMessage.textContent = error.message;
    authMessage.style.color = "#dc2626";
  }
});

logoutBtn.addEventListener("click", async function () {
  if (unsubscribeTasks) unsubscribeTasks();
  if (unsubscribeElectives) unsubscribeElectives();
  await signOut(auth);
});

onAuthStateChanged(auth, function (user) {
  if (user) {
    currentUser = user;

    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    userPanel.classList.remove("hidden");
    userEmail.textContent = user.email;

    startListeners();
    loadElectivesIntoDropdown();
  } else {
    currentUser = null;

    if (unsubscribeTasks) unsubscribeTasks();
    if (unsubscribeElectives) unsubscribeElectives();

    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    userPanel.classList.add("hidden");
    userEmail.textContent = "";

    tasks = [];
    electives = [];
  }
});

// ---------- USER-SPECIFIC STORAGE ----------


function startListeners() {
  const tasksRef = collection(db, "users", currentUser.uid, "tasks");
  unsubscribeTasks = onSnapshot(tasksRef, function (snapshot) {
    tasks = snapshot.docs.map(function (d) { return { id: d.id, ...d.data() }; });
    refreshApp();
  });
const profileRef = doc(db, "users", currentUser.uid, "settings", "profile");
getDoc(profileRef).then(function (snapshot) {
  if (snapshot.exists()) {
    usernameDisplay.textContent = snapshot.data().username || currentUser.email;
  } else {
    usernameDisplay.textContent = currentUser.email;
  }
});
  const electivesDocRef = doc(db, "users", currentUser.uid, "settings", "electives");
  unsubscribeElectives = onSnapshot(electivesDocRef, function (snapshot) {
    electives = snapshot.exists() ? snapshot.data().list || [] : [];
    loadElectivesIntoDropdown();
  });
}
// ---------- TASK FUNCTIONS ----------

function getDaysLeft(dueDate) {
  const today = new Date();
  const due = new Date(dueDate);

  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const difference = due - today;
  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

function getUrgency(task) {
  const daysLeft = getDaysLeft(task.dueDate);

  if (task.status === "Complete") return "completed";
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= 3) return "due-soon";
  return "upcoming";
}

function getUrgencyText(task) {
  const urgency = getUrgency(task);

  if (urgency === "completed") return "Completed";
  if (urgency === "overdue") return "Overdue";
  if (urgency === "due-soon") return "Due Soon";
  return "Upcoming";
}

function getPriorityScore(task) {
  const daysLeft = getDaysLeft(task.dueDate);

  const urgencyScore = daysLeft <= 0 ? 10 : Math.max(0, 10 - daysLeft);
  const weightingScore = Number(task.weighting) / 10;

  let priorityScore = 1;
  if (task.priority === "Medium") priorityScore = 3;
  if (task.priority === "High") priorityScore = 5;

  return (urgencyScore + weightingScore + priorityScore).toFixed(1);
}

taskForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const newTask = {
    subject: document.getElementById("subject").value,
    taskName: document.getElementById("taskName").value.trim(),
    dueDate: document.getElementById("dueDate").value,
    weighting: document.getElementById("weighting").value,
    priority: document.getElementById("priority").value,
    status: document.getElementById("status").value,
    notes: document.getElementById("notes").value.trim(),
    createdAt: Date.now()
  };

  const taskId = String(Date.now());
  const taskRef = doc(db, "users", currentUser.uid, "tasks", taskId);
  await setDoc(taskRef, newTask);

  taskForm.reset();
});

function displayTasks(taskArray) {
  taskList.innerHTML = "";

  if (taskArray.length === 0) {
    taskList.innerHTML = `<p class="empty-message">No tasks added yet.</p>`;
    return;
  }

  taskArray.forEach(function (task) {
    const daysLeft = getDaysLeft(task.dueDate);
    const urgency = getUrgency(task);
    const urgencyText = getUrgencyText(task);
    const priorityScore = getPriorityScore(task);

    let daysText = "";

    if (task.status === "Complete") {
      daysText = "Task completed";
    } else if (daysLeft < 0) {
      daysText = `${Math.abs(daysLeft)} day(s) overdue`;
    } else if (daysLeft === 0) {
      daysText = "Due today";
    } else {
      daysText = `${daysLeft} day(s) left`;
    }

    const taskCard = document.createElement("div");
    taskCard.className = `task-card ${urgency}`;

    taskCard.innerHTML = `
      <h3>${task.subject}: ${task.taskName}</h3>
      <p><strong>Due date:</strong> ${task.dueDate}</p>
      <p><strong>Time status:</strong> ${daysText}</p>
      <p><strong>Weighting:</strong> ${task.weighting}%</p>
      <p><strong>Priority:</strong> ${task.priority}</p>
      <p><strong>Status:</strong> ${task.status}</p>
      <p><strong>Urgency label:</strong> ${urgencyText}</p>
      <p><strong>Priority score:</strong> ${priorityScore}</p>
      <p><strong>Notes:</strong> ${task.notes || "No notes added."}</p>

      <button onclick="openEditModal('${task.id}')">Edit</button>
      <button onclick="markComplete('${task.id}')">Mark Complete</button>
      <button onclick="deleteTask('${task.id}')">Delete</button>
    `;

    taskList.appendChild(taskCard);
  });
}

async function markComplete(id) {
  const taskRef = doc(db, "users", currentUser.uid, "tasks", id);
  await updateDoc(taskRef, { status: "Complete" });
}

async function deleteTask(id) {
  const confirmed = window.confirm("Are you sure you want to delete this task?");
  if (!confirmed) return;
  const taskRef = doc(db, "users", currentUser.uid, "tasks", id);
  await deleteDoc(taskRef);
}
// ---------- SETTINGS MODAL ----------

function openSettingsModal() {
  usernameInput.value = "";
  newPasswordInput.value = "";
  usernameMessage.textContent = "";
  passwordMessage.textContent = "";
  settingsElectiveMessage.textContent = "";
  deleteAccountMessage.textContent = "";

  loadUsernameIntoSettings();
loadElectivesIntoSettings();
  settingsModal.classList.remove("hidden");
}

function closeSettingsModal() {
  settingsModal.classList.add("hidden");
}

closeSettingsBtn.addEventListener("click", closeSettingsModal);

settingsModal.addEventListener("click", function (e) {
  if (e.target === settingsModal) closeSettingsModal();
});

async function loadUsernameIntoSettings() {
  const profileRef = doc(db, "users", currentUser.uid, "settings", "profile");
  const snapshot = await getDoc(profileRef);
  if (snapshot.exists()) {
    const username = snapshot.data().username || "";
    usernameInput.value = username;
    usernameDisplay.textContent = username || currentUser.email;
  } else {
    usernameDisplay.textContent = currentUser.email;
  }
}

saveUsernameBtn.addEventListener("click", async function () {
  const username = usernameInput.value.trim();

  if (username === "") {
    usernameMessage.textContent = "Please enter a username.";
    usernameMessage.style.color = "#dc2626";
    return;
  }

  const profileRef = doc(db, "users", currentUser.uid, "settings", "profile");
  await setDoc(profileRef, { username });

  usernameDisplay.textContent = username;
  usernameMessage.textContent = "Username saved!";
  usernameMessage.style.color = "#16a34a";
});

changePasswordBtn.addEventListener("click", async function () {
  const newPassword = newPasswordInput.value;

  if (newPassword.length < 6) {
    passwordMessage.textContent = "Password must be at least 6 characters.";
    passwordMessage.style.color = "#dc2626";
    return;
  }

  try {
    await updatePassword(currentUser, newPassword);
    passwordMessage.textContent = "Password updated successfully!";
    passwordMessage.style.color = "#16a34a";
    newPasswordInput.value = "";
  } catch (error) {
    passwordMessage.textContent = error.message;
    passwordMessage.style.color = "#dc2626";
  }
});

async function loadElectivesIntoSettings() {
  const electivesDocRef = doc(db, "users", currentUser.uid, "settings", "electives");
  const snapshot = await getDoc(electivesDocRef);
  const list = snapshot.exists() ? snapshot.data().list || [] : [];

  electivesList.innerHTML = "";

  if (list.length === 0) {
    electivesList.innerHTML = `<p class="empty-message">No electives added yet.</p>`;
    return;
  }

  list.forEach(function (elective) {
    const row = document.createElement("div");
    row.className = "elective-row";
    row.innerHTML = `
      <span>${elective}</span>
      <button type="button" onclick="deleteElective('${elective}')">Remove</button>
    `;
    electivesList.appendChild(row);
  });
}

window.deleteElective = async function (elective) {
  const updated = electives.filter(function (e) { return e !== elective; });
  const electivesDocRef = doc(db, "users", currentUser.uid, "settings", "electives");
  await setDoc(electivesDocRef, { list: updated });
  renderElectivesList();
};

settingsAddElectiveBtn.addEventListener("click", async function () {
  const newElective = settingsElectiveInput.value.trim();

  if (newElective === "") {
    settingsElectiveMessage.textContent = "Please enter a subject name.";
    settingsElectiveMessage.style.color = "#dc2626";
    return;
  }

  if (electives.length >= 3) {
    settingsElectiveMessage.textContent = "You can only add up to 3 elective subjects.";
    settingsElectiveMessage.style.color = "#dc2626";
    return;
  }

  const alreadyExists =
    DEFAULT_SUBJECTS.some(function (s) { return s.toLowerCase() === newElective.toLowerCase(); }) ||
    electives.some(function (e) { return e.toLowerCase() === newElective.toLowerCase(); });

  if (alreadyExists) {
    settingsElectiveMessage.textContent = "That subject already exists.";
    settingsElectiveMessage.style.color = "#dc2626";
    return;
  }

  const updated = [...electives, newElective];
  const electivesDocRef = doc(db, "users", currentUser.uid, "settings", "electives");
  await setDoc(electivesDocRef, { list: updated });

  settingsElectiveInput.value = "";
  settingsElectiveMessage.textContent = `${newElective} added!`;
  settingsElectiveMessage.style.color = "#16a34a";
});

deleteAccountBtn.addEventListener("click", async function () {
  const confirmed = window.confirm("Are you absolutely sure? This will permanently delete your account and all your tasks. This cannot be undone.");
  if (!confirmed) return;

  try {
    const tasksRef = collection(db, "users", currentUser.uid, "tasks");
    await deleteDoc(doc(db, "users", currentUser.uid, "settings", "electives"));
    await deleteDoc(doc(db, "users", currentUser.uid, "settings", "profile"));
    await deleteUser(currentUser);
  } catch (error) {
    deleteAccountMessage.textContent = "Error deleting account. You may need to log out and log back in before deleting.";
    deleteAccountMessage.style.color = "#dc2626";
  }
});
// ---------- EDIT MODAL ----------

function openEditModal(id) {
  const task = tasks.find(function (t) { return t.id === id; });
  if (!task) return;

  editingTaskId = id;

  editSubject.innerHTML = "";
  DEFAULT_SUBJECTS.forEach(function (s) {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    editSubject.appendChild(opt);
  });
  electives.forEach(function (e) {
    const opt = document.createElement("option");
    opt.value = e;
    opt.textContent = e;
    editSubject.appendChild(opt);
  });

  editSubject.value = task.subject;
  editTaskName.value = task.taskName;
  editDueDate.value = task.dueDate;
  editWeighting.value = task.weighting;
  editPriority.value = task.priority;
  editStatus.value = task.status;
  editNotes.value = task.notes || "";

  editModal.classList.remove("hidden");
}

cancelEditBtn.addEventListener("click", function () {
  editModal.classList.add("hidden");
  editingTaskId = null;
});

editModal.addEventListener("click", function (e) {
  if (e.target === editModal) {
    editModal.classList.add("hidden");
    editingTaskId = null;
  }
});

editForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  if (!editingTaskId) return;

  const taskRef = doc(db, "users", currentUser.uid, "tasks", editingTaskId);
  await updateDoc(taskRef, {
    subject: editSubject.value,
    taskName: editTaskName.value.trim(),
    dueDate: editDueDate.value,
    weighting: editWeighting.value,
    priority: editPriority.value,
    status: editStatus.value,
    notes: editNotes.value.trim()
  });

  editModal.classList.add("hidden");
  editingTaskId = null;
});
// ---------- DASHBOARD ----------

function updateDashboard() {
  const total = tasks.length;

  const completed = tasks.filter(function (task) {
    return task.status === "Complete";
  }).length;

  const overdue = tasks.filter(function (task) {
    return getUrgency(task) === "overdue";
  }).length;

  const dueThisWeek = tasks.filter(function (task) {
    const daysLeft = getDaysLeft(task.dueDate);
    return daysLeft >= 0 && daysLeft <= 7 && task.status !== "Complete";
  }).length;

  totalTasksEl.textContent = total;
  completedTasksEl.textContent = completed;
  overdueTasksEl.textContent = overdue;
  dueThisWeekEl.textContent = dueThisWeek;
}

function updateCharts() {
  const subjectCounts = {};
  const statusCounts = {};

tasks.forEach(function (task) {
  subjectCounts[task.subject] = (subjectCounts[task.subject] || 0) + 1;
  statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
});

const incompleteCounts = {};
tasks.filter(function (task) {
  return task.status === "Not started" || task.status === "In progress";
}).forEach(function (task) {
  incompleteCounts[task.subject] = (incompleteCounts[task.subject] || 0) + 1;
});

  if (subjectChart) subjectChart.destroy();
  if (statusChart) statusChart.destroy();

  const subjectCanvas = document.getElementById("subjectChart");
  const statusCanvas = document.getElementById("statusChart");

  subjectChart = new Chart(subjectCanvas, {
  type: "bar",
  data: {
    labels: Object.keys(incompleteCounts),
    datasets: [{
      label: "Incomplete Tasks",
      data: Object.values(incompleteCounts),
      backgroundColor: [
  "#2563eb", "#f97316", "#16a34a", "#dc2626", "#9333ea", "#0891b2", "#ca8a04", "#db2777"
]
    }]
  },
  options: {
  responsive: true,
  plugins: {
    legend: { display: false }
  },
  scales: {
    y: { beginAtZero: true, ticks: { stepSize: 1 } }
  }
}
});

  statusChart = new Chart(statusCanvas, {
    type: "bar",
    data: {
      labels: Object.keys(statusCounts),
      datasets: [
        {
          label: "Number of Tasks",
          data: Object.values(statusCounts)
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

// ---------- FILTERS ----------

function updateSubjectFilter() {
  const currentValue = subjectFilter.value;

  const subjects = [...new Set(tasks.map(function (task) {
    return task.subject;
  }))];

  subjectFilter.innerHTML = `<option value="all">All Subjects</option>`;

  subjects.forEach(function (subject) {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = subject;
    subjectFilter.appendChild(option);
  });

  subjectFilter.value = currentValue;
}

function applyFilters() {
  const selectedSubject = subjectFilter.value;
  const selectedStatus = statusFilter.value;

  let filteredTasks = [...tasks];

  if (selectedSubject !== "all") {
    filteredTasks = filteredTasks.filter(function (task) {
      return task.subject === selectedSubject;
    });
  }

  if (selectedStatus !== "all") {
    filteredTasks = filteredTasks.filter(function (task) {
      return task.status === selectedStatus;
    });
  }

  displayTasks(filteredTasks);
}

sortDueDateBtn.addEventListener("click", function () {
  tasks.sort(function (a, b) {
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  refreshApp();
});

subjectFilter.addEventListener("change", applyFilters);
statusFilter.addEventListener("change", applyFilters);

// ---------- ELECTIVES ----------


function loadElectivesIntoDropdown() {
  subjectDropdown.innerHTML = `<option value="">Select a subject</option>`;

  DEFAULT_SUBJECTS.forEach(function (s) {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    subjectDropdown.appendChild(opt);
  });

  electives.forEach(function (e) {
    const opt = document.createElement("option");
    opt.value = e;
    opt.textContent = e;
    subjectDropdown.appendChild(opt);
  });
}

async function addElective() {
  const newElective = electiveInput.value.trim();

  if (newElective === "") {
    electiveMessage.textContent = "Please enter an elective subject.";
    electiveMessage.style.color = "#dc2626";
    return;
  }

  if (electives.length >= 3) {
    electiveMessage.textContent = "You can only add up to 3 elective subjects.";
    electiveMessage.style.color = "#dc2626";
    return;
  }

  const defaultSubjects = ["Mathematics", "English", "Science", "Geography", "History", "PDHPE"];

  const subjectAlreadyExists =
    defaultSubjects.some(function (subject) {
      return subject.toLowerCase() === newElective.toLowerCase();
    }) ||
    electives.some(function (elective) {
      return elective.toLowerCase() === newElective.toLowerCase();
    });

  if (subjectAlreadyExists) {
    electiveMessage.textContent = "That subject is already in the dropdown.";
    electiveMessage.style.color = "#dc2626";
    return;
  }

 const updated = [...electives, newElective];
 const electivesDocRef = doc(db, "users", currentUser.uid, "settings", "electives");
 await setDoc(electivesDocRef, { list: updated });

  electiveInput.value = "";
  electiveMessage.textContent = `${newElective} has been added.`;
  electiveMessage.style.color = "#16a34a";

  loadElectivesIntoDropdown();
}

// ---------- WORKLOAD WARNING ----------

function updateWorkloadWarning() {
  const dueSoon = tasks.filter(task => {
    const days = getDaysLeft(task.dueDate);
    return days >= 0 && days <= 7 && task.status !== "Complete";
  });

  const totalWeighting = dueSoon.reduce((sum, task) => {
    return sum + Number(task.weighting || 0);
  }, 0);

  if (dueSoon.length >= 3) {
    workloadWarning.textContent = `Warning: You have ${dueSoon.length} assessments due within 7 days, totalling ${totalWeighting}% of your grade. This is a heavy workload week.`;
  } else if (dueSoon.length > 0) {
    workloadWarning.textContent = `Heads up: You have ${dueSoon.length} assessment(s) due within 7 days, totalling ${totalWeighting}% of your grade.`;
  } else {
    workloadWarning.textContent = "No major workload warnings yet.";
  }
}

function refreshApp() {
  loadElectivesIntoDropdown();
  displayTasks(tasks);
  updateDashboard();
  updateCharts();
  updateSubjectFilter();
  updateWorkloadWarning();
}

window.markComplete = markComplete;
window.deleteTask = deleteTask;
window.openEditModal = openEditModal;
window.openSettingsModal = openSettingsModal;