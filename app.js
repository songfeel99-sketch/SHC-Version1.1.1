/* =========================================================
   ទិន្នន័យថ្នាក់រៀន (in-memory — export to Excel to save it)
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

/* រចនាសម្ព័ន្ធ៖ data[teacherName] = [ {name, gender, dob}, ... ] */
const data = {};
CLASSES.forEach(name => { data[name] = []; });

/* គំរូទិន្នន័យដំបូង (អាចលុប/កែប្រែបាន) */
data["សំអាត ស៊ីអា"] = [
  { name: "សុខ សុភា",   gender: "ស្រី",  dob: "2016-03-12" },
  { name: "ចាន់ ដារ៉ា",  gender: "ប្រុស", dob: "2016-07-04" }
];
data["ដួង សុជាតា"] = [
  { name: "លី សុវណ្ណ",  gender: "ប្រុស", dob: "2015-11-20" }
];
data["Van Sabut"] = [
  { name: "ហេង ចាន់ថា", gender: "ស្រី",  dob: "2016-01-30" }
];

let activeClass = CLASSES[0];
let editingIndex = null; /* null = add mode, number = edit mode */

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
  activeTitleEl.textContent = activeClass;
  activeSubEl.textContent = `គ្រូបន្ទុកថ្នាក់ ៖ ${activeClass}`;

  const rows = data[activeClass];
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
  const total = CLASSES.reduce((sum, name) => sum + data[name].length, 0);
  totalCountEl.textContent = total;
}

function renderAll(){
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
const fieldDob        = document.getElementById("fieldDob");

document.getElementById("addStudentBtn").addEventListener("click", () => {
  editingIndex = null;
  modalTitle.textContent = "បន្ថែមសិស្សថ្មី";
  studentForm.reset();
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
    dob: fieldDob.value
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
    fieldDob.value = student.dob;
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
  const rows = data[className].map((s, i) => [i + 1, s.name, s.gender, formatDob(s.dob)]);
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
        /* Match the sheet to a known class by name; if importing for the
           active class only, use the first sheet regardless of its name. */
        let targetClass = null;
        if (onlyActiveClass){
          targetClass = activeClass;
        } else {
          targetClass = CLASSES.find(c => sanitizeSheetName(c) === sheetName);
        }
        if (!targetClass) return;

        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
        /* skip header row, expect: [no, name, gender, dob] */
        const body = rows.slice(1);
        const parsed = body
          .filter(r => r && r[1])
          .map(r => ({
            name: String(r[1]).trim(),
            gender: normalizeGender(r[2]),
            dob: normalizeDob(r[3])
          }));

        if (onlyActiveClass){
          data[targetClass] = parsed;
        } else {
          data[targetClass] = parsed;
        }
        importedCount += parsed.length;

        if (onlyActiveClass) return; /* only first relevant sheet matters */
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
  /* dd/mm/yyyy -> yyyy-mm-dd for the <input type="date"> */
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy){
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return str;
}

/* =========================================================
   ចាប់ផ្តើម
   ========================================================= */
renderAll();
