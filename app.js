/* =========================================================
   ការកំណត់ Firebase
   សូមប្តូរតម្លៃខាងក្រោមនេះជាព័ត៌មានគណនី Firebase ពិតរបស់អ្នក
   (ចូលទៅ Firebase Console > Project settings > Your apps > SDK config)
   ========================================================= */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ពាក្យសម្ងាត់សម្រាប់ចូលជា Admin — សូមប្តូរជាថ្មីមុនប្រើប្រាស់ពិត! */
const ADMIN_PASSWORD = "smilehope2026";

/* =========================================================
   ទិន្នន័យថ្នាក់រៀន
   ទិន្នន័យពិតត្រូវបានទាញយក/រក្សាទុកតាម Firebase Firestore ដោយស្វ័យប្រវត្តិ
   ========================================================= */
const CLASSES = [
  "សំអាត ស៊ីអា",
  "ដួង សុជាតា",
  "នៃ វិច្ឆិកា",
  "គីម រីដា",
  "ជា ប៊ុនរិន",
  "ឈាង សុភី",
  "Van Sabut"
];

function classDocId(index){ return "c" + index; }

/* រចនាសម្ព័ន្ធ៖ data[teacherName] = [ {name, gender, dob}, ... ] */
const data = {};
CLASSES.forEach(name => { data[name] = []; });

let activeClass = CLASSES[0];
let editingIndex = null; /* null = add mode, number = edit mode */
let currentUser = null;  /* { role: "teacher" | "admin", class: string|null } */

/* =========================================================
   ការភ្ជាប់ Firestore (ធ្វើសមកាលកម្មទិន្នន័យតាមពេលវេលាពិត)
   ========================================================= */
let firestoreReady = false;
CLASSES.forEach((name, index) => {
  db.collection("classes").doc(classDocId(index))
    .onSnapshot(docSnap => {
      const students = (docSnap.exists && Array.isArray(docSnap.data().students))
        ? docSnap.data().students
        : [];
      data[name] = students;
      firestoreReady = true;
      if (currentUser) renderAll();
    }, err => {
      console.error("Firestore sync error:", err);
      showToast("មិនអាចភ្ជាប់ទៅមូលដ្ឋានទិន្នន័យ Firebase បានទេ។ សូមពិនិត្យការកំណត់", true);
    });
});

function saveClassToFirestore(className){
  const index = CLASSES.indexOf(className);
  if (index === -1) return;
  db.collection("classes").doc(classDocId(index))
    .set({ students: data[className] })
    .catch(err => {
      console.error("Firestore save error:", err);
      showToast("មិនអាចរក្សាទុកទិន្នន័យទៅ Firebase បានទេ", true);
    });
}

/* =========================================================
   ការចូលប្រើប្រាស់ (Login) — ជ្រើសរើសថ្នាក់ ឬ Admin
   ========================================================= */
const loginScreenEl   = document.getElementById("loginScreen");
const loginGridEl     = document.getElementById("loginClassGrid");
const loginAdminBtn   = document.getElementById("loginAdminBtn");
const appContainerEl  = document.getElementById("appContainer");
const logoutBtnEl     = document.getElementById("logoutBtn");
const sidebarEl       = document.getElementById("sidebarNav");

function renderLoginScreen(){
  loginGridEl.innerHTML = "";
  CLASSES.forEach(name => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "login-class-btn";
    btn.innerHTML = `
      <span class="class-avatar">${escapeHtml(name.trim().charAt(0))}</span>
      <span>${escapeHtml(name)}</span>
    `;
    btn.addEventListener("click", () => loginAsTeacher(name));
    loginGridEl.appendChild(btn);
  });
}

function loginAsTeacher(className){
  currentUser = { role: "teacher", class: className };
  activeClass = className;
  enterApp();
}

function loginAsAdmin(){
  const pwd = prompt("សូមបញ្ចូលពាក្យសម្ងាត់ Admin៖");
  if (pwd === null) return;
  if (pwd === ADMIN_PASSWORD){
    currentUser = { role: "admin", class: null };
    activeClass = CLASSES[0];
    enterApp();
  } else {
    showToast("ពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ", true);
  }
}

function enterApp(){
  loginScreenEl.hidden = true;
  appContainerEl.hidden = false;
  logoutBtnEl.hidden = false;

  if (currentUser.role === "teacher"){
    sidebarEl.hidden = true;
    document.getElementById("exportAllBtn").hidden = true;
    document.getElementById("importAllInput").parentElement.hidden = true;
  } else {
    sidebarEl.hidden = false;
    document.getElementById("exportAllBtn").hidden = false;
    document.getElementById("importAllInput").parentElement.hidden = false;
  }
  renderAll();
}

function logout(){
  currentUser = null;
  appContainerEl.hidden = true;
  logoutBtnEl.hidden = true;
  loginScreenEl.hidden = false;
}

loginAdminBtn.addEventListener("click", loginAsAdmin);
logoutBtnEl.addEventListener("click", logout);
renderLoginScreen();

/* =========================================================
   ការគូរផ្ទាំង (Render)
   ========================================================= */
const classListEl   = document.getElementById("classList");
const tableBodyEl   = document.getElementById("studentTableBody");
const emptyStateEl  = document.getElementById("emptyState");
const activeTitleEl = document.getElementById("activeClassTitle");
const activeSubEl   = document.getElementById("activeClassSub");
const totalCountEl  = document.getElementById("totalStudents");

function renderSidebar(){
  if (!currentUser || currentUser.role !== "admin") return;
  classListEl.innerHTML = "";
  CLASSES.forEach(name => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "class-item" + (name === activeClass ? " active" : "");
    btn.innerHTML = `
      <span class="class-avatar">${escapeHtml(name.trim().charAt(0))}</span>
      <span class="class-name">${escapeHtml(name)}</span>
      <span class="class-count">${data[name].length}</span>
    `;
    btn.addEventListener("click", () => {
      activeClass = name;
      renderAll();
    });
    li.appendChild(btn);
    classListEl.appendChild(li);
  });
}

function renderTable(){
  if (!currentUser) return;
  activeTitleEl.textContent = activeClass;
  activeSubEl.textContent = `គ្រូបន្ទុកថ្នាក់ ៖ ${activeClass}`;

  const rows = data[activeClass] || [];
  tableBodyEl.innerHTML = "";

  if (rows.length === 0){
    emptyStateEl.hidden = false;
  } else {
    emptyStateEl.hidden = true;
    rows.forEach((student, index) => {
      const tr = document.createElement("tr");
      const genderClass = student.gender === "ប្រុស" ? "male" : "female";
      tr.innerHTML = `
        <td class="col-index">${index + 1}</td>
        <td>${escapeHtml(student.name)}</td>
        <td><span class="gender-tag ${genderClass}">${escapeHtml(student.gender)}</span></td>
        <td>${formatDob(student.dob)}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-action="edit" data-index="${index}" type="button">កែប្រែ</button>
            <button class="icon-btn danger" data-action="delete" data-index="${index}" type="button">លុប</button>
          </div>
        </td>
      `;
      tableBodyEl.appendChild(tr);
    });
  }
}

function renderTotals(){
  const total = CLASSES.reduce((sum, name) => sum + (data[name] ? data[name].length : 0), 0);
  totalCountEl.textContent = total;
}

function renderAll(){
  if (!currentUser) return;
  renderSidebar();
  renderTable();
  renderTotals();
}

function formatDob(dobStr){
  if (!dobStr) return "";
  const parts = String(dobStr).split("-");
  if (parts.length === 3){
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return dobStr;
}

function escapeHtml(str){
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* =========================================================
   ការបន្ថែម / កែប្រែ / លុប សិស្ស
   ========================================================= */
const modalBackdrop = document.getElementById("modalBackdrop");
const modalTitle     = document.getElementById("modalTitle");
const studentForm    = document.getElementById("studentForm");
const fieldName       = document.getElementById("fieldName");
const fieldGender     = document.getElementById("fieldGender");
const fieldDobDay     = document.getElementById("fieldDobDay");
const fieldDobMonth   = document.getElementById("fieldDobMonth");
const fieldDobYear    = document.getElementById("fieldDobYear");

/* បំពេញ Dropdown ថ្ងៃ/ខែ/ឆ្នាំ (ឆ្នាំសកលជានិច្ច មិនប្រែប្រួលតាមភាសាកម្មវិធីរុករកទេ) */
function populateDobDropdowns(){
  fieldDobDay.innerHTML = "";
  for (let d = 1; d <= 31; d++){
    const opt = document.createElement("option");
    opt.value = String(d).padStart(2, "0");
    opt.textContent = d;
    fieldDobDay.appendChild(opt);
  }

  fieldDobMonth.innerHTML = "";
  for (let m = 1; m <= 12; m++){
    const opt = document.createElement("option");
    opt.value = String(m).padStart(2, "0");
    opt.textContent = m;
    fieldDobMonth.appendChild(opt);
  }

  fieldDobYear.innerHTML = "";
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 20; y--){
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = y;
    fieldDobYear.appendChild(opt);
  }
}
populateDobDropdowns();

function setDobFields(dobStr){
  if (!dobStr){
    fieldDobDay.selectedIndex = 0;
    fieldDobMonth.selectedIndex = 0;
    fieldDobYear.selectedIndex = 0;
    return;
  }
  const parts = String(dobStr).split("-");
  if (parts.length === 3){
    const [y, m, d] = parts;
    fieldDobYear.value = y;
    fieldDobMonth.value = m;
    fieldDobDay.value = d;
  }
}

function getDobFromFields(){
  return `${fieldDobYear.value}-${fieldDobMonth.value}-${fieldDobDay.value}`;
}

document.getElementById("addStudentBtn").addEventListener("click", () => {
  editingIndex = null;
  modalTitle.textContent = "បន្ថែមសិស្សថ្មី";
  studentForm.reset();
  setDobFields("");
  modalBackdrop.hidden = false;
  fieldName.focus();
});

document.getElementById("cancelBtn").addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});

function closeModal(){
  modalBackdrop.hidden = true;
  editingIndex = null;
  studentForm.reset();
}

studentForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const student = {
    name: fieldName.value.trim(),
    gender: fieldGender.value,
    dob: getDobFromFields()
  };
  if (!student.name || !student.gender || !student.dob){
    showToast("សូមបំពេញព័ត៌មានឱ្យគ្រប់គ្រាន់", true);
    return;
  }
  if (editingIndex === null){
    data[activeClass].push(student);
    showToast("បានបន្ថែមសិស្សដោយជោគជ័យ");
  } else {
    data[activeClass][editingIndex] = student;
    showToast("បានកែប្រែព័ត៌មានសិស្ស");
  }
  saveClassToFirestore(activeClass);
  closeModal();
  renderAll();
});

tableBodyEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const index = Number(btn.dataset.index);
  const action = btn.dataset.action;

  if (action === "delete"){
    const student = data[activeClass][index];
    if (confirm(`តើអ្នកចង់លុប "${student.name}" ចេញពីថ្នាក់នេះមែនទេ?`)){
      data[activeClass].splice(index, 1);
      saveClassToFirestore(activeClass);
      showToast("បានលុបទិន្នន័យសិស្ស");
      renderAll();
    }
  }

  if (action === "edit"){
    const student = data[activeClass][index];
    editingIndex = index;
    modalTitle.textContent = "កែប្រែព័ត៌មានសិស្ស";
    fieldName.value = student.name;
    fieldGender.value = student.gender;
    setDobFields(student.dob);
    modalBackdrop.hidden = false;
    fieldName.focus();
  }
});

/* =========================================================
   ការជូនដំណឹង (Toast)
   ========================================================= */
let toastTimer = null;
function showToast(message, isError = false){
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast" + (isError ? " error" : "");
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
}

/* =========================================================
   នាំចេញ Excel (Export)
   ========================================================= */
const HEADERS = ["ល.រ", "ឈ្មោះសិស្ស", "ភេទ", "ថ្ងៃខែឆ្នាំកំណើត"];

function classToSheetData(className){
  const rows = (data[className] || []).map((s, i) => [i + 1, s.name, s.gender, formatDob(s.dob)]);
  return [HEADERS, ...rows];
}

document.getElementById("exportClassBtn").addEventListener("click", () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(classToSheetData(activeClass));
  ws["!cols"] = [{ wch: 6 }, { wch: 24 }, { wch: 10 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(activeClass));
  XLSX.writeFile(wb, `${activeClass}.xlsx`);
  showToast("បានទាញយកឯកសារ Excel ថ្នាក់នេះ");
});

document.getElementById("exportAllBtn").addEventListener("click", () => {
  const wb = XLSX.utils.book_new();
  CLASSES.forEach(name => {
    const ws = XLSX.utils.aoa_to_sheet(classToSheetData(name));
    ws["!cols"] = [{ wch: 6 }, { wch: 24 }, { wch: 10 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(name));
  });
  XLSX.writeFile(wb, "សិស្ស-ទាំងអស់.xlsx");
  showToast("បានទាញយកឯកសារ Excel ទាំង ៧ ថ្នាក់");
});

function sanitizeSheetName(name){
  /* Excel sheet names: max 31 chars, no \ / ? * [ ] : */
  return name.replace(/[\\/?*\[\]:]/g, "").slice(0, 31);
}

/* =========================================================
   នាំចូល Excel (Import)
   ========================================================= */
document.getElementById("importClassInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  importWorkbook(file, { onlyActiveClass: true });
  e.target.value = "";
});

document.getElementById("importAllInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  importWorkbook(file, { onlyActiveClass: false });
  e.target.value = "";
});

function importWorkbook(file, { onlyActiveClass }){
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const wb = XLSX.read(evt.target.result, { type: "array" });
      let importedCount = 0;

      wb.SheetNames.forEach(sheetName => {
        let targetClass = null;
        if (onlyActiveClass){
          targetClass = activeClass;
        } else {
          targetClass = CLASSES.find(c => sanitizeSheetName(c) === sheetName);
        }
        if (!targetClass) return;

        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
        const body = rows.slice(1);
        const parsed = body
          .filter(r => r && r[1])
          .map(r => ({
            name: String(r[1]).trim(),
            gender: normalizeGender(r[2]),
            dob: normalizeDob(r[3])
          }));

        data[targetClass] = parsed;
        saveClassToFirestore(targetClass);
        importedCount += parsed.length;

        if (onlyActiveClass) return;
      });

      renderAll();
      showToast(`បាននាំចូលទិន្នន័យសិស្សចំនួន ${importedCount} នាក់`);
    } catch (err){
      console.error(err);
      showToast("មិនអាចអានឯកសារនេះបានទេ។ សូមពិនិត្យទ្រង់ទ្រាយឯកសារ", true);
    }
  };
  reader.readAsArrayBuffer(file);
}

function normalizeGender(val){
  const v = String(val || "").trim();
  if (v === "ប្រុស" || v.toLowerCase() === "male" || v.toLowerCase() === "m") return "ប្រុស";
  if (v === "ស្រី" || v.toLowerCase() === "female" || v.toLowerCase() === "f") return "ស្រី";
  return v;
}

function normalizeDob(val){
  if (!val) return "";
  const str = String(val).trim();
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy){
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return str;
}
