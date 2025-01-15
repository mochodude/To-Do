// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, increment, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBDHfzUTGzPKxEc7IlDMczbwkW9GTGrcH4",
  authDomain: "to-do-12cef.firebaseapp.com",
  projectId: "to-do-12cef",
  storageBucket: "to-do-12cef.appspot.com",
  messagingSenderId: "14729232710",
  appId: "1:14729232710:web:07c326c9fb30d1da00e547",
  measurementId: "G-EN4YPNH0H8",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("login-button");
const signupButton = document.getElementById("signup-button");
const taskListContainer = document.getElementById("task-list");
const newTaskInput = document.getElementById("new-task");
const addTaskButton = document.getElementById("add-task-button");
const pointsElement = document.getElementById("points");
const leaderboardList = document.getElementById("leaderboard-list");
const spotifyButton = document.getElementById("spotify-btn");

const authContainer = document.getElementById("auth-container");
const taskListSection = document.getElementById("task-list-container");
const pointsSection = document.getElementById("points-section");
const leaderboardSection = document.getElementById("leaderboard-section");
const musicSection = document.getElementById("music-container");

let userId = null;
let taskStartTime = null;
let taskCooldown = false; // To handle cooldown for completing tasks too fast

// Initially hide task list, points, leaderboard, and music sections
taskListSection.style.display = "none";
pointsSection.style.display = "none";
leaderboardSection.style.display = "none";
musicSection.style.display = "none";

// Event Listeners
loginButton.addEventListener("click", loginUser);
signupButton.addEventListener("click", signupUser);
addTaskButton.addEventListener("click", addTask);
spotifyButton.addEventListener("click", openSpotify);

// Signup Function
function signupUser(event) {
  event.preventDefault();
  const email = emailInput.value;
  const password = passwordInput.value;

  createUserWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      const user = userCredential.user;
      userId = user.uid;

      // Add user to Firestore with default points
      setDoc(doc(db, "users", userId), { username: email, points: 0 });

      loadUserPoints(userId);
      toggleAuthSection();
    })
    .catch(error => alert(error.message));
}

// Login Function
function loginUser(event) {
  event.preventDefault();
  const email = emailInput.value;
  const password = passwordInput.value;

  signInWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      const user = userCredential.user;
      userId = user.uid;
      loadUserPoints(userId);
      toggleAuthSection();
    })
    .catch(error => alert(error.message));
}

// Add Task Function
function addTask() {
  if (!userId) {
    alert("Please log in first.");
    return;
  }

  const taskText = newTaskInput.value.trim();
  if (!taskText) return;

  const taskId = `task_${Date.now()}`;
  taskStartTime = Date.now(); // Store the start time when the task is created

  setDoc(doc(db, "tasks", userId, "userTasks", taskId), {
    text: taskText,
    completed: false,
    startTime: taskStartTime // Store start time in Firestore
  }).then(() => {
    newTaskInput.value = "";
    loadTasks();
  });
}

// Load Tasks
function loadTasks() {
  if (!userId) return;

  getDocs(collection(db, "tasks", userId, "userTasks")).then(snapshot => {
    taskListContainer.innerHTML = '';
    snapshot.forEach(doc => {
      const taskData = doc.data();
      const li = document.createElement("li");
      li.textContent = taskData.text;
      li.setAttribute("data-id", doc.id); // Add task ID as data attribute

      const completeButton = document.createElement("button");
      completeButton.textContent = "Complete";
      completeButton.addEventListener("click", () => completeTask(doc.id, li, taskData.startTime)); // Pass start time to check duration

      li.appendChild(completeButton);
      taskListContainer.appendChild(li);
    });
  });
}

// Complete Task Function
function completeTask(taskId, taskElement, taskStartTime) {
  if (!userId) return;

  // Check if task was completed too quickly
  const taskCompletionTime = Date.now();
  const timeDifference = taskCompletionTime - taskStartTime;

  if (timeDifference < 5000) { // If the task was completed in under 5 seconds
    alert("Task completed too fast! Please take your time.");
    return;
  }

  // Mark task as completed in Firestore
  updateDoc(doc(db, "tasks", userId, "userTasks", taskId), {
    completed: true,
  }).then(() => {
    // Update points for completing a task
    updatePoints(userId, 10);

    // Animate the task being swiped off and delete it from Firestore
    taskElement.classList.add("task-completed");
    setTimeout(() => {
      taskElement.remove();
      deleteDoc(doc(db, "tasks", userId, "userTasks", taskId)); // Remove task from Firestore
    }, 500); // Delay for swipe animation
  });
}

// Update Points
function updatePoints(userId, points) {
  if (taskCooldown) {
    alert("You need to slow down! Wait a moment before completing another task.");
    return;
  }

  taskCooldown = true; // Start cooldown period
  setTimeout(() => {
    taskCooldown = false; // End cooldown after a short period
  }, 3000); // 3-second cooldown

  updateDoc(doc(db, "users", userId), {
    points: increment(points),
  }).then(() => loadUserPoints(userId));
}

// Load Points
function loadUserPoints(userId) {
  getDoc(doc(db, "users", userId)).then(doc => {
    if (doc.exists()) {
      pointsElement.innerText = doc.data().points || 0;
    }
  });
}

// Load Leaderboard
function loadLeaderboard() {
  getDocs(collection(db, "users")).then(snapshot => {
    leaderboardList.innerHTML = '';
    snapshot.forEach(doc => {
      const user = doc.data();
      const leaderboardItem = document.createElement("div");
      leaderboardItem.innerHTML = `${user.username}: ${user.points} points`;
      leaderboardList.appendChild(leaderboardItem);
    });
  });
}

// Open Spotify
function openSpotify() {
  const spotifyUrl = "https://open.spotify.com/";
  const popupWindow = window.open(spotifyUrl, "Spotify", "width=600,height=400");
  if (popupWindow) popupWindow.focus();
}

// Auth State Listener
onAuthStateChanged(auth, user => {
  if (user) {
    userId = user.uid;
    loadUserPoints(userId);
    loadTasks();
    loadLeaderboard();
    toggleAuthSection();
  } else {
    // User is logged out, reset UI
    userId = null;
    taskListSection.style.display = "none";
    pointsSection.style.display = "none";
    leaderboardSection.style.display = "none";
    musicSection.style.display = "none";
    authContainer.style.display = "block";
  }
});

// Toggle auth and content visibility
function toggleAuthSection() {
  authContainer.style.display = "none"; // Hide login/signup
  taskListSection.style.display = "block"; // Show task list
  pointsSection.style.display = "block"; // Show points section
  leaderboardSection.style.display = "block"; // Show leaderboard section
  musicSection.style.display = "block"; // Show music section
}
