let courses = [];

(function init() {
  try {
    const saved = localStorage.getItem("courses");
    courses = saved ? JSON.parse(saved) : [];
  } catch (e) {
    courses = [];
  }
  renderAll();
  enhanceGradeDropdown();
})();

function showError(msg) {
  const el = document.getElementById("error");
  if (!el) return;
  el.textContent = msg || "";
  el.style.display = msg ? "block" : "none";
}

function saveCourses() {
  try {
    localStorage.setItem("courses", JSON.stringify(courses));
  } catch (e) {

  }
}

function addCourse() {
  const subjInput = document.getElementById("subject");
  const creditInput = document.getElementById("credit");
  const gradeSelect = document.getElementById("grade");

  const subj = (subjInput.value || "").trim();
  const cr = parseFloat(creditInput.value);
  const gr = parseFloat(gradeSelect.value);
  const letter = gradeSelect.options[gradeSelect.selectedIndex]?.text || "";

  if (!subj) {
    showError("Please enter a subject.");
    subjInput.focus();
    return;
  }
  if (!Number.isFinite(cr) || cr <= 0) {
    showError("Please enter a valid credit (> 0).");
    creditInput.focus();
    return;
  }
  if (!Number.isFinite(gr)) {
    showError("Please choose a grade.");
    gradeSelect.focus();
    return;
  }

  showError("");

  const course = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    subject: subj,
    credit: cr,
    grade: gr,
    letter: letter,
  };
  courses.push(course);
  saveCourses();

  subjInput.value = "";
  creditInput.value = "";
  gradeSelect.selectedIndex = 0;
  gradeSelect.dispatchEvent(new Event("change"));

  renderAll();
}

function removeCourse(id) {
  courses = courses.filter((c) => c.id !== id);
  saveCourses();
  renderAll();
}

function renderCourses() {
  const tableBody = document.querySelector("#courseTable tbody");
  if (!tableBody) return;
  tableBody.innerHTML = "";

  for (const c of courses) {
    const row = document.createElement("tr");

    const subjCell = document.createElement("td");
    subjCell.textContent = c.subject;
    row.appendChild(subjCell);

    const crCell = document.createElement("td");
    crCell.textContent = c.credit;
    row.appendChild(crCell);

    const grCell = document.createElement("td");
    grCell.textContent = `${c.letter} (${c.grade})`;
    row.appendChild(grCell);

    const actionCell = document.createElement("td");
    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.onclick = function () {
      removeCourse(c.id);
    };
    actionCell.appendChild(btn);
    row.appendChild(actionCell);

    tableBody.appendChild(row);
  }
}

function calculateGPA() {
  if (courses.length === 0) {
    return { gpa: 0, totalCredits: 0 };
  }
  let totalPoints = 0;
  let totalCredits = 0;
  for (const c of courses) {
    totalPoints += c.grade * c.credit;
    totalCredits += c.credit;
  }
  const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
  return { gpa, totalCredits };
}

function renderTotals() {
  const { gpa, totalCredits } = calculateGPA();
  const gpaEl = document.getElementById("gpaResult");
  const creditEl = document.getElementById("creditTotal");
  const clearBtn = document.getElementById("clearAllBtn");
  if (gpaEl) gpaEl.textContent = "Overall GPA: " + gpa.toFixed(2);
  if (creditEl) creditEl.textContent = "Total Credits: " + totalCredits;
  if (clearBtn) clearBtn.disabled = courses.length === 0;
}

function renderAll() {
  renderCourses();
  renderTotals();
}

function clearAllCourses() {
  if (courses.length === 0) return;
  const ok = confirm("Clear all courses? This cannot be undone.");
  if (!ok) return;
  courses = [];
  try {
    localStorage.removeItem("courses");
  } catch (e) {

  }
  renderAll();
  showError("");
}

function enhanceGradeDropdown() {
  const select = document.getElementById("grade");
  if (!select || select.dataset.enhanced) return;
  select.dataset.enhanced = "true";

  const label = document.querySelector('label[for="grade"]');
  if (label && !label.id) label.id = "gradeLabel";

  const wrapper = document.createElement("div");
  wrapper.className = "dropdown";
  wrapper.id = "gradeDropdown";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "dropdown-toggle";
  toggle.setAttribute("aria-haspopup", "listbox");
  toggle.setAttribute("aria-expanded", "false");
  if (label) toggle.setAttribute("aria-labelledby", label.id);

  const menu = document.createElement("ul");
  menu.className = "dropdown-menu";
  menu.setAttribute("role", "listbox");
  menu.tabIndex = -1;

  select.parentNode.insertBefore(wrapper, select.nextSibling);
  wrapper.appendChild(toggle);
  wrapper.appendChild(menu);

  select.classList.add("visually-hidden");

  let optionEls = [];
  let activeIndex = -1;

  function buildOptions() {
    menu.innerHTML = "";
    optionEls = [];
    Array.from(select.options).forEach((opt, idx) => {
      if (opt.disabled) return;
      const li = document.createElement("li");
      li.className = "dropdown-option";
      li.setAttribute("role", "option");
      li.dataset.index = String(idx);
      li.dataset.value = opt.value;
      li.setAttribute("aria-selected", opt.selected ? "true" : "false");
      li.innerHTML = `${opt.text} <span class="muted">(${opt.value})</span>`;
      li.addEventListener("click", () => selectByIndex(idx));
      menu.appendChild(li);
      optionEls.push(li);
    });
  }

  function updateButton() {
    const sel = select.options[select.selectedIndex];
    toggle.textContent = sel ? sel.text : "Select grade";
  }

  function setActive(idx) {
    optionEls.forEach((el) => el.classList.remove("active"));
    if (idx >= 0 && idx < optionEls.length) {
      optionEls[idx].classList.add("active");
      optionEls[idx].scrollIntoView({ block: "nearest" });
      activeIndex = idx;
    }
  }

  function syncFromSelect() {
    optionEls.forEach((el) => el.setAttribute("aria-selected", "false"));
    const selIdx = select.selectedIndex;
    const match = optionEls.find((el) => Number(el.dataset.index) === selIdx);
    if (match) match.setAttribute("aria-selected", "true");
    updateButton();
  }

  function openMenu() {
    menu.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");

    const selIdx = select.selectedIndex;
    const visibleIdx = optionEls.findIndex((el) => Number(el.dataset.index) === selIdx);
    setActive(visibleIdx >= 0 ? visibleIdx : 0);
    document.addEventListener("click", onOutsideClick, true);
    menu.addEventListener("keydown", onMenuKeyDown);
    menu.focus();
  }

  function closeMenu() {
    menu.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", onOutsideClick, true);
    menu.removeEventListener("keydown", onMenuKeyDown);
  }

  function onOutsideClick(e) {
    if (!wrapper.contains(e.target)) {
      closeMenu();
    }
  }

  function onToggleKeyDown(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (menu.classList.contains("open")) return;
      openMenu();
    }
  }

  function onMenuKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
      toggle.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, optionEls.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const el = optionEls[activeIndex];
      if (el) selectByIndex(Number(el.dataset.index));
    } else if (e.key === "Tab") {
      closeMenu();
    }
  }

  function selectByIndex(idx) {
    select.selectedIndex = idx;
    select.dispatchEvent(new Event("change"));
    optionEls.forEach((el) => el.setAttribute("aria-selected", "false"));
    const visibleIdx = optionEls.findIndex((el) => Number(el.dataset.index) === idx);
    if (visibleIdx >= 0) optionEls[visibleIdx].setAttribute("aria-selected", "true");
    updateButton();
    closeMenu();
    toggle.focus();
  }

  buildOptions();
  updateButton();
  syncFromSelect();

  toggle.addEventListener("click", () => {
    if (menu.classList.contains("open")) closeMenu(); else openMenu();
  });
  toggle.addEventListener("keydown", onToggleKeyDown);
  select.addEventListener("change", syncFromSelect);
}
