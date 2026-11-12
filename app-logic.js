let communityAccessCode = null;
let dockPasscode = null;
let pendingEmailCode = null;
let pendingRegisterEmail = null;
let pendingRegisterPassword = null;
let pendingRegisterId = null;
let pendingPostContent = null;
let pendingPostApprovalCode = null;
let userHasSetDockPasscode = localStorage.getItem("user-dock-passcode-set") === "true";
let userHasSeenDockNotice = localStorage.getItem("dock-notice-accepted") === "true";


// Simple local storage save/load utilities
function saveLocalData(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function loadLocalData(key, defaultVal) {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultVal;
}
function simpleHash(str) {
    let hash = 0;
    for(let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i);
    return hash.toString();
}
function generateRandom6DigitCode() { return Math.floor(100000 + Math.random() * 900000).toString(); }


// Initialize full app state with head developer account pre-created
let appState = loadLocalData("ylz-community-data", {
    currentUser: null,
    users: [
        {id:1, email:"user@example.com", passwordHash: simpleHash("user123"), role:"user", verified: true, verificationId:"", twoFAEnabled: false},
        {id:2, email:"mod@example.com", passwordHash: simpleHash("mod123"), role:"moderator", verified: true, verificationId:"", twoFAEnabled: true, twoFASecret:"123456"},
        {id:3, email:"admin@example.com", passwordHash: simpleHash("admin123"), role:"admin", verified: true, verificationId:"", twoFAEnabled: true, twoFASecret:"123456"},
        {id:4, email:"davidmazeelementdaka@gmail.com", passwordHash: simpleHash("headdev123"), role:"developer", verified: true, verificationId:"HEAD_DEV_MASTER", twoFAEnabled: false, isHeadDeveloper: true}
    ],
    pendingAccounts: [],
    pendingPosts: [],
    publishedPosts: [],
    helplines: [
        {id:1, name:"Zambia 24/7 Mental Health Support Line", number:"+260 97 123 4567"},
        {id:2, name:"Childline Zambia", number:"116"},
        {id:3, name:"Zambia Police Emergency", number:"999"}
    ],
    developerAccounts: [],
    pendingRoleApplications: [],
    auditLog: []
});


let dockState = loadLocalData("ylz-private-dock", {
    journal: "", goodHabits: [], badHabits: [], goals: [], resolutions: [], monthlyIncome: 0, totalSavings: 0
});


function saveAppState() { saveLocalData("ylz-community-data", appState); updateRoleUI(); renderAllDynamicUI(); }
function saveDockState() { saveLocalData("ylz-private-dock", dockState); }


function updateRoleUI() {
    if(!appState.currentUser) {
        document.getElementById("auth-buttons").classList.remove("hidden");
        document.getElementById("user-menu").classList.add("hidden");
        document.getElementById("mod-nav-btn").classList.add("hidden");
        document.getElementById("admin-nav-btn").classList.add("hidden");
        document.getElementById("dev-nav-btn").classList.add("hidden");
        return;
    }
    document.getElementById("auth-buttons").classList.add("hidden");
    document.getElementById("user-menu").classList.remove("hidden");
    document.getElementById("current-role").textContent = `Logged in as ${appState.currentUser.role}`;
    if(appState.currentUser.role === "moderator" || appState.currentUser.role === "admin" || appState.currentUser.role === "developer") {
        document.getElementById("mod-nav-btn").classList.remove("hidden");
    }
    if(appState.currentUser.role === "admin" || appState.currentUser.role === "developer") {
        document.getElementById("admin-nav-btn").classList.remove("hidden");
    }
    if(appState.currentUser.role === "developer") {
        document.getElementById("dev-nav-btn").classList.remove("hidden");
    }
}


function renderAllDynamicUI() {
    // Render helplines
    document.getElementById("helplines-list").innerHTML = appState.helplines.map(line => `
        <div class="p-4 bg-blue-50 rounded-lg flex justify-between items-center">
            <div>
                <h3 class="font-bold text-blue-800">${line.name}</h3>
                <p class="text-sm text-gray-600 mt-1">${line.number}</p>
            </div>
            ${appState.currentUser?.role === "developer" ? `<button onclick="deleteHelpline(${line.id})" class="text-red-500"><i class="fa fa-trash"></i></button>` : ""}
        </div>
    `).join("");


    // Render published posts
    document.getElementById("published-posts").innerHTML = appState.publishedPosts.map(post => `
        <div class="bg-white rounded-xl p-4 shadow-md">
            <p class="text-gray-700">${post.content}</p>
            <p class="text-xs text-gray-400 mt-2">Posted by ${post.authorEmail}</p>
        </div>
    `).join("");


    // Render moderator pending posts
    document.getElementById("mod-pending-posts").innerHTML = appState.pendingPosts.map(post => `
        <div class="p-3 bg-white rounded-lg border">
            <p class="text-gray-700">${post.content}</p>
            <p class="text-xs text-gray-400 mt-1">From: ${post.authorEmail}</p>
            <div class="flex gap-2 mt-2">
                <button onclick="approvePendingPost(${post.id})" class="text-sm bg-green-500 text-white px-3 py-1 rounded">Approve</button>
                <button onclick="rejectPendingPost(${post.id})" class="text-sm bg-red-500 text-white px-3 py-1 rounded">Reject</button>
            </div>
        </div>
    `).join("");


    // Render admin pending accounts
    document.getElementById("admin-pending-accounts").innerHTML = appState.pendingAccounts.map(acc => `
        <div class="p-3 bg-white rounded-lg border">
            <p class="text-gray-700">${acc.email}</p>
            <p class="text-xs text-gray-400 mt-1">ID: ${acc.verificationId}</p>
            <div class="flex gap-2 mt-2">
                <button onclick="approvePendingAccount(${acc.id})" class="text-sm bg-green-500 text-white px-3 py-1 rounded">Approve</button>
                <button onclick="rejectPendingAccount(${acc.id})" class="text-sm bg-red-500 text-white px-3 py-1 rounded">Reject</button>
            </div>
        </div>
    `).join("");


    // Render developer accounts list
    document.getElementById("dev-accounts-list").innerHTML = appState.developerAccounts.map(dev => `
        <div class="p-3 bg-white rounded-lg border flex justify-between items-center">
            <p class="text-gray-700">${dev.email}</p>
            ${appState.currentUser?.isHeadDeveloper ? `<button onclick="deleteDeveloperAccount(${dev.id})" class="text-red-500"><i class="fa fa-trash"></i> Delete</button>` : ""}
        </div>
    `).join("");


    // Render pending role applications
    document.getElementById("dev-pending-role-applications").innerHTML = appState.pendingRoleApplications.map(app => `
        <div class="p-3 bg-white rounded-lg border">
            <p class="text-gray-700">${app.email} applied for ${app.targetRole} role</p>
            <div class="flex gap-2 mt-2">
                <button onclick="approveRoleApplication(${app.id})" class="text-sm bg-green-500 text-white px-3 py-1 rounded">Approve</button>
                <button onclick="rejectRoleApplication(${app.id})" class="text-sm bg-red-500 text-white px-3 py-1 rounded">Reject</button>
            </div>
        </div>
    `).join("");
}


function switchTab(tabName) {
    document.querySelectorAll(".app-tab").forEach(tab => tab.classList.add("hidden"));
    document.getElementById(`tab-${tabName}`).classList.remove("hidden");
}
function openDock() {
    if(!userHasSetDockPasscode) { 
        document.getElementById("dock-first-setup-modal").classList.remove("hidden");
        return;
    }
    if(!userHasSeenDockNotice) {
        document.getElementById("dock-warning-modal").classList.remove("hidden");
        return;
    }
    document.getElementById("dock-unlock-modal").classList.remove("hidden");
}
function openRoleLogin() {
    document.getElementById("role-login-modal").classList.remove("hidden");
}
function logout() { appState.currentUser = null; saveAppState(); switchTab('feed'); }


// Helpline management functions
window.deleteHelpline = function(id) {
    appState.helplines = appState.helplines.filter(line => line.id !== id);
    saveAppState();
}
window.deleteDeveloperAccount = function(id) {
    if(!appState.currentUser?.isHeadDeveloper) return alert("Only head developer can delete developer accounts");
    appState.developerAccounts = appState.developerAccounts.filter(dev => dev.id !== id);
    saveAppState();
}
window.approvePendingPost = function(id) {
    const post = appState.pendingPosts.find(p => p.id === id);
    if(post) {
        appState.publishedPosts.push(post);
        appState.pendingPosts = appState.pendingPosts.filter(p => p.id !== id);
        saveAppState();
    }
}
window.rejectPendingPost = function(id) {
    appState.pendingPosts = appState.pendingPosts.filter(p => p.id !== id);
    saveAppState();
}
window.approvePendingAccount = function(id) {
    const acc = appState.pendingAccounts.find(a => a.id === id);
    if(acc) {
        acc.verified = true;
        appState.users.push(acc);
        appState.pendingAccounts = appState.pendingAccounts.filter(a => a.id !== id);
        saveAppState();
    }
}
window.rejectPendingAccount = function(id) {
    appState.pendingAccounts = appState.pendingAccounts.filter(a => a.id !== id);
    saveAppState();
}
window.approveRoleApplication = function(id) {
    const app = appState.pendingRoleApplications.find(a => a.id === id);
    if(app) {
        const user = appState.users.find(u => u.email === app.email);
        if(user) user.role = app.targetRole;
        appState.pendingRoleApplications = appState.pendingRoleApplications.filter(a => a.id !== id);
        saveAppState();
    }
}
window.rejectRoleApplication = function(id) {
    appState.pendingRoleApplications = appState.pendingRoleApplications.filter(a => a.id !== id);
    saveAppState();
}


document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("unlock-platform").addEventListener("click", () => {
        communityAccessCode = document.getElementById("community-secret-key").value.trim();
        if(!communityAccessCode) return alert("Please enter the community access code");
        document.getElementById("community-key-modal").classList.add("hidden");
        alert("Platform unlocked successfully");
        renderAllDynamicUI();
    })


    document.getElementById("confirm-first-dock-key").addEventListener("click", () => {
        const key1 = document.getElementById("first-dock-key-1").value.trim();
        const key2 = document.getElementById("first-dock-key-2").value.trim();
        if(!key1 || key1.length < 8) return alert("Your private dock passcode must be at least 8 characters long");
        if(key1 !== key2) return alert("The two passcodes you entered do not match, please re-enter");
        dockPasscode = simpleHash(key1);
        localStorage.setItem("user-dock-passcode-set", "true");
        userHasSetDockPasscode = true;
        document.getElementById("dock-first-setup-modal").classList.add("hidden");
        alert("Your custom private dock passcode has been set successfully, please remember it well");
    })


    document.getElementById("accept-dock-warning").addEventListener("click", () => {
        localStorage.setItem("dock-notice-accepted", "true");
        userHasSeenDockNotice = true;
        document.getElementById("dock-warning-modal").classList.add("hidden");
        document.getElementById("dock-unlock-modal").classList.remove("hidden");
    })


    document.getElementById("unlock-dock").addEventListener("click", () => {
        const inputKey = document.getElementById("dock-unlock-key").value.trim();
        if(simpleHash(inputKey) !== simpleHash(dockPasscode)) return alert("Wrong passcode, please try again");
        document.getElementById("dock-unlock-modal").classList.add("hidden");
        switchTab('dock');
        document.getElementById("private-journal").value = dockState.journal;
        document.getElementById("monthly-income").value = dockState.monthlyIncome;
        document.getElementById("total-savings").value = dockState.totalSavings;
        document.getElementById("good-habits-list").innerHTML = dockState.goodHabits.map(h => `<p>✅ ${h}</p>`).join("");
        document.getElementById("bad-habits-list").innerHTML = dockState.badHabits.map(h => `<p>⏳ ${h}</p>`).join("");
        document.getElementById("goals-list").innerHTML = dockState.goals.map(h => `<p>📚 ${h}</p>`).join("");
        document.getElementById("resolutions-list").innerHTML = dockState.resolutions.map(h => `<p>🏃 ${h}</p>`).join("");
        document.getElementById("financial-summary").innerHTML = `<p>💸 Monthly balance: ZMW ${dockState.monthlyIncome - dockState.totalSavings}</p>`;
    })


    // Close all modals when clicking close button
    document.querySelectorAll(".close-modal").forEach(btn => {
        btn.addEventListener("click", (e) => e.target.closest(".fixed").classList.add("hidden"));
    })


    // Open modals trigger
    document.getElementById("open-login-btn").addEventListener("click", () => document.getElementById("login-modal").classList.remove("hidden"));
    document.getElementById("open-register-btn").addEventListener("click", () => document.getElementById("register-modal").classList.remove("hidden"));


    // Login logic
    document.getElementById("submit-login").addEventListener("click", () => {
        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value.trim();
        const targetUser = appState.users.find(u => u.email === email && u.passwordHash === simpleHash(password));
        if(!targetUser) return alert("Wrong email or password");
        if(targetUser.twoFAEnabled) {
            document.getElementById("2fa-field").classList.remove("hidden");
            return alert("Please enter your 6-digit 2FA code");
        }
        appState.currentUser = targetUser;
        saveAppState();
        document.getElementById("login-modal").classList.add("hidden");
        alert("Login successful");
    })


    // Role verification login logic
    document.getElementById("submit-role-login").addEventListener("click", () => {
        const email = document.getElementById("role-login-email").value.trim();
        const password = document.getElementById("role-login-password").value.trim();
        const targetUser = appState.users.find(u => u.email === email && u.passwordHash === simpleHash(password));
        if(!targetUser || !["moderator", "admin", "developer"].includes(targetUser.role)) return alert("Invalid role account credentials");
        appState.currentUser = targetUser;
        saveAppState();
        document.getElementById("role-login-modal").classList.add("hidden");
        alert("Role access unlocked successfully");
    })


    // Register flow logic
    document.getElementById("send-verification-code").addEventListener("click", () => {
        pendingEmailCode = generateRandom6DigitCode();
        pendingRegisterEmail = document.getElementById("register-email").value.trim();
        pendingRegisterPassword = document.getElementById("register-password").value.trim();
        pendingRegisterId = document.getElementById("register-id").value.trim();
        if(!pendingRegisterEmail || !pendingRegisterPassword || !pendingRegisterId) return alert("Please fill all required fields first");
        document.getElementById("email-verification-field").classList.remove("hidden");
        alert(`6-digit verification code sent (simulated): ${pendingEmailCode}`);
    })


    document.getElementById("submit-register").addEventListener("click", () => {
        const inputCode = document.getElementById("email-verification-code").value.trim();
        if(inputCode !== pendingEmailCode) return alert("Wrong verification code");
        const applyForRole = document.getElementById("apply-for-admin-role").checked;
        const newPendingAccount = {
            id: Date.now(),
            email: pendingRegisterEmail,
            passwordHash: simpleHash(pendingRegisterPassword),
            verificationId: pendingRegisterId,
            verified: false,
            twoFAEnabled: false,
            role: "user"
        };
        appState.pendingAccounts.push(newPendingAccount);
        if(applyForRole) {
            appState.pendingRoleApplications.push({
                id: Date.now(),
                email: pendingRegisterEmail,
                targetRole: "moderator"
            })
        }
        saveAppState();
        document.getElementById("register-modal").classList.add("hidden");
        alert("Your registration has been submitted for approval, you will be notified once it is reviewed");
    })


    // New post flow logic
    document.getElementById("submit-new-post").addEventListener("click", () => {
        if(!appState.currentUser) return alert("Please login first to post content");
        pendingPostContent = document.getElementById("new-post-content").value.trim();
        if(!pendingPostContent) return alert("Please write your post content first");
        pendingPostApprovalCode = generateRandom6DigitCode();
        document.getElementById("post-approval-modal").classList.remove("hidden");
        alert(`6-digit post approval code sent to davidmazeelementdaka@gmail.com (simulated): ${pendingPostApprovalCode}`);
    })


    document.getElementById("confirm-post-approval").addEventListener("click", () => {
        const inputCode = document.getElementById("post-approval-code").value.trim();
        if(inputCode !== pendingPostApprovalCode) return alert("Wrong post approval code");
        const newPendingPost = {
            id: Date.now(),
            content: pendingPostContent,
            authorEmail: appState.currentUser.email
        };
        appState.pendingPosts.push(newPendingPost);
        saveAppState();
        document.getElementById("post-approval-modal").classList.add("hidden");
        document.getElementById("new-post-content").value = "";
        alert("Your post has been submitted to the moderator review queue");
    })


    // Private dock operations
    document.getElementById("save-journal").addEventListener("click", () => {
        dockState.journal = document.getElementById("private-journal").value.trim();
        saveDockState();
        alert("Private journal saved successfully");
    })


    document.getElementById("add-good-habit").addEventListener("click", () => {
        const habit = document.getElementById("new-good-habit").value.trim();
        if(!habit) return alert("Please enter the habit content first");
        dockState.goodHabits.push(habit);
        saveDockState();
        document.getElementById("good-habits-list").innerHTML += `<p>✅ ${habit}</p>`;
        document.getElementById("new-good-habit").value = "";
    })


    document.getElementById("add-bad-habit").addEventListener("click", () => {
        const habit = document.getElementById("new-bad-habit").value.trim();
        if(!habit) return alert("Please enter the habit content first");
        dockState.badHabits.push(habit);
        saveDockState();
        document.getElementById("bad-habits-list").innerHTML += `<p>⏳ ${habit}</p>`;
        document.getElementById("new-bad-habit").value = "";
    })


    document.getElementById("add-goal").addEventListener("click", () => {
        const goal = document.getElementById("new-goal").value.trim();
        if(!goal) return alert("Please enter the goal content first");
        dockState.goals.push(goal);
        saveDockState();
        document.getElementById("goals-list").innerHTML += `<p>📚 ${goal}</p>`;
        document.getElementById("new-goal").value = "";
    })


    document.getElementById("add-resolution").addEventListener("click", () => {
        const resolution = document.getElementById("new-resolution").value.trim();
        if(!resolution) return alert("Please enter the resolution content first");
        dockState.resolutions.push(resolution);
        saveDockState();
        document.getElementById("resolutions-list").innerHTML += `<p>🏃 ${resolution}</p>`;
        document.getElementById("new-resolution").value = "";
    })


    document.getElementById("save-finances").addEventListener("click", () => {
        dockState.monthlyIncome = Number(document.getElementById("monthly-income").value) || 0;
        dockState.totalSavings = Number(document.getElementById("total-savings").value) || 0;
        saveDockState();
        document.getElementById("financial-summary").innerHTML = `<p>💸 Monthly balance: ZMW ${dockState.monthlyIncome - dockState.totalSavings}</p>`;
        alert("Financial data saved successfully");
    })


    // Developer panel operations
    document.getElementById("add-new-helpline").addEventListener("click", () => {
        const name = document.getElementById("new-helpline-name").value.trim();
        const number = document.getElementById("new-helpline-number").value.trim();
        if(!name || !number) return alert("Please fill both helpline name and number");
        appState.helplines.push({id: Date.now(), name, number});
        saveAppState();
        document.getElementById("new-helpline-name").value = "";
        document.getElementById("new-helpline-number").value = "";
        alert("New helpline added successfully");
    })


    document.getElementById("create-new-dev-account").addEventListener("click", () => {
        if(!appState.currentUser?.isHeadDeveloper) return alert("Only head developer can create new developer accounts");
        const email = document.getElementById("new-dev-email").value.trim();
        const password = document.getElementById("new-dev-password").value.trim();
        if(!email || !password) return alert("Please fill new developer account email and password");
        const newDevAccount = {
            id: Date.now(),
            email,
            passwordHash: simpleHash(password),
            role: "developer",
            verified: true,
            verificationId: "",
            twoFAEnabled: false
        };
        appState.users.push(newDevAccount);
        appState.developerAccounts.push({id: Date.now(), email});
        saveAppState();
        document.getElementById("new-dev-email").value = "";
        document.getElementById("new-dev-password").value = "";
        alert("New developer account created successfully");
    })
})