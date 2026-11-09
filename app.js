const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const screens = {
  welcome: document.querySelector("#welcome"),
  register: document.querySelector("#register"),
  verify: document.querySelector("#verify"),
  name: document.querySelector("#name"),
  login: document.querySelector("#login"),
  forgot: document.querySelector("#forgot"),
  reset: document.querySelector("#reset"),
  home: document.querySelector("#home"),
  "onboard-curate": document.querySelector("#onboard-curate"),
  "onboard-help": document.querySelector("#onboard-help"),
  "dash-first": document.querySelector("#dash-first"),
  "dash-wards": document.querySelector("#dash-wards"),
  "my-animals": document.querySelector("#my-animals"),
  help: document.querySelector("#help"),
  shelter: document.querySelector("#shelter"),
  animal: document.querySelector("#animal"),
  terms: document.querySelector("#terms"),
  "profile-edit": document.querySelector("#profile-edit"),
  notices: document.querySelector("#notices"),
  donate: document.querySelector("#donate"),
  needs: document.querySelector("#needs"),
  curate: document.querySelector("#curate"),
  test: document.querySelector("#test"),
};

const titles = {
  register: "Створення профілю",
  verify: "Підтвердження",
  name: "Створення профілю",
  login: "Вхід",
  forgot: "Відновлення",
  reset: "Новий пароль",
  home: "Профіль",
  terms: "Умови кураторства",
  "profile-edit": "Редагувати профіль",
  notices: "Сповіщення",
  donate: "Благодійний внесок",
  needs: "Потреби притулку",
  curate: "Оформлення кураторства",
  test: "Тест",
};

const backTarget = {
  register: "welcome",
  verify: "register",
  name: "welcome",
  login: "welcome",
  forgot: "login",
  reset: "login",
  home: "welcome",
};

let returnScreen = "shelter";
let donateReturn = "dash-first";
let needsReturn = "dash-first";
let curateReturn = "animal";
let curateStep = "type";
let curateType = "";
let curateAmount = "";
let currentAnimal = "chani";
let testStep = "1";
const testAnswers = { care: "", age: "", kind: "" };
let settingsReturn = "dash-first";
let profileEmail = "";
let profilePhone = "";

const headerless = new Set([
  "welcome",
  "onboard-curate",
  "onboard-help",
  "dash-first",
  "dash-wards",
  "my-animals",
  "help",
  "shelter",
]);

const header = document.querySelector("#screen-header");
const title = document.querySelector("#screen-title");
const resetToken = new URLSearchParams(location.search).get("reset") || "";

let current = "welcome";
let pendingEmail = "";
let profileName = "";
let hasWards = false;
let species = "all";
let shelterQuery = "";
const applied = { age: "", health: new Set(), other: new Set(), full: false };
const draft = { age: "4-10", health: new Set(), other: new Set(), full: false };

const curators = {
  lana: { name: "Лана", photo: "/assets/curator-lana.svg", svg: true },
  vitaliy: { name: "Віталій", photo: "/assets/curator-vitaliy.png", svg: false },
  ira: { name: "Іра", photo: "/assets/curator-ira.png", svg: false },
  olya: { name: "Оля", photo: "/assets/curator-olya.svg", svg: true },
  vlad: { name: "Vlad", photo: "/assets/curator-vlad.png", svg: false },
  iraAgain: { name: "Іра", photo: "/assets/curator-olya.svg", svg: true },
};

const catalog = {
  reno: {
    name: "Рено",
    species: "Песик",
    kind: "dog",
    ageLabel: "3 роки",
    years: 3,
    sex: "Хлопчик",
    health: "На лікуванні",
    healthKey: "treatment",
    tags: [],
    fullCare: false,
    raised: 860,
    goal: 2100,
    photo: "/assets/animal-reno.png",
    cardPhoto: "/assets/animal-reno.png",
    story: [
      "Мене зняли з прив’язі біля траси посеред зими. Лапа ще заживає, але хвіст уже працює на повну — я вітаю кожного, хто заходить у двір.",
      "Найбільше люблю довгі прогулянки і коли мені чухають за вухом. Мрію про дім, де можна спати біля дверей і стерегти своїх людей.",
    ],
    curators: ["vitaliy", "vlad", "olya", "lana"],
  },
  lili: {
    name: "Лілі",
    species: "Кішечка",
    kind: "cat",
    ageLabel: "3 місяці",
    years: 0.25,
    sex: "Дівчинка",
    health: "Здорова",
    healthKey: "healthy",
    tags: [],
    fullCare: false,
    raised: 420,
    goal: 900,
    photo: "/assets/animal-lili.png",
    cardPhoto: "/assets/animal-lili.png",
    story: [
      "Я народилася в притулку і ще вміщаюся в долоні. Світ для мене — це шурхіт пакета і теплі коліна, на яких можна заснути.",
      "Граюся до останньої сили, а потім згортаюся клубочком. Шукаю родину, яка не проти маленьких нічних концертів.",
    ],
    curators: ["ira", "olya", "lana"],
  },
  pinokio: {
    name: "Пінокіо",
    species: "Песик",
    kind: "dog",
    ageLabel: "4 роки",
    years: 4,
    sex: "Хлопчик",
    health: "Здоровий",
    healthKey: "healthy",
    tags: [],
    fullCare: false,
    raised: 1500,
    goal: 1800,
    photo: "/assets/animal-pinokio.png",
    cardPhoto: "/assets/animal-pinokio.png",
    story: [
      "Ніс у мене і справді видає мене: я скрізь знаходжу смачне. До притулку потрапив після того, як загубився на ринку і ніхто не озвався.",
      "У домі я спокійний, а на вулиці веселий. Хочу господаря, з яким можна вчити нові команди і ділити вечерю. Ну, майже ділити.",
    ],
    curators: ["vlad", "vitaliy", "ira", "olya"],
  },
  chani: {
    name: "Чані",
    species: "Котик",
    kind: "cat",
    ageLabel: "5 років",
    years: 5,
    sex: "Дівчинка",
    health: "Здорова",
    healthKey: "healthy",
    tags: [],
    fullCare: false,
    raised: 1112,
    goal: 1641,
    photo: "/assets/animal-chani.png",
    cardPhoto: "/assets/animal-chani-card.png",
    story: [
      "Мене знайшли в саду, коли я ще ледве вставала на ніжки. Тепер я вже доросла, і моя улюблена гра — гонитва за сонячними променями по кімнаті.",
      "Я дуже люблю, коли мене гладять, і завжди чекаю на обійми. Моя мрія — знайти свою родину, де мені завжди буде тепло, затишно та багато любові.",
    ],
    curators: ["lana", "vitaliy", "ira", "olya", "vlad", "iraAgain"],
  },
  kvitka: {
    name: "Квітка",
    species: "Собачка",
    kind: "dog",
    ageLabel: "3 роки",
    years: 3,
    sex: "Дівчинка",
    health: "На лікуванні",
    healthKey: "treatment",
    tags: [],
    fullCare: false,
    raised: 640,
    goal: 2300,
    photo: "/assets/animal-kvitka.png",
    cardPhoto: "/assets/animal-kvitka.png",
    story: [
      "Мене знайшли в полі з покусаним вухом. Лікування ще триває, але я вже знову бігаю за м’ячем і прошу добавки ласки.",
      "З дітьми я ніжна, а гучних звуків трохи лякаюся. Мрію про тихий двір, де можна грітися на сонці й нікуди не поспішати.",
    ],
    curators: ["olya", "ira", "lana", "vitaliy"],
  },
  lesyk: {
    name: "Лесик",
    species: "Котик",
    kind: "cat",
    ageLabel: "3 місяці",
    years: 0.25,
    sex: "Хлопчик",
    health: "Здоровий",
    healthKey: "healthy",
    tags: [],
    fullCare: false,
    raised: 300,
    goal: 800,
    photo: "/assets/animal-lesyk.png",
    cardPhoto: "/assets/animal-lesyk.png",
    story: [
      "Я сірий вихор, якого врятували з підвалу. Вуса в мене серйозні, а характер — грайливий: усе нове треба спершу обнюхати, а тоді зловити.",
      "Люблю ховатися в коробки і вистрибувати на шнурки. Шукаю дім, де є підвіконня і хтось, хто сміється з моїх витівок.",
    ],
    curators: ["lana", "ira", "vlad"],
  },
};

const shelterOrder = ["reno", "lili", "pinokio", "chani", "pinokio", "chani"];

const defaultTab = {
  "dash-first": "home",
  "dash-wards": "home",
  shelter: "shelter",
  "my-animals": "wards",
  help: "help",
};

function show(screen, tab) {
  current = screen;
  for (const [name, element] of Object.entries(screens)) {
    element.hidden = name !== screen;
  }
  const bar = screens[screen]?.querySelector(".tabbar");
  const active = tab || defaultTab[screen];
  if (bar && active) {
    for (const button of bar.querySelectorAll(".tab")) {
      button.classList.toggle("is-active", button.dataset.go === active);
    }
  }
  header.hidden = headerless.has(screen);
  header.classList.toggle("is-animal", screen === "animal");
  title.textContent = screen === "animal" ? title.dataset.animalName || "Чані" : titles[screen] || "";
  if (screen === "dash-first") {
    const who = profileName || "Оля";
    document.querySelector("#dash-greeting").textContent = `${who}, тут ти можеш стати куратором для тваринок, яких обереш`;
  }
  document.querySelector(".phone").classList.toggle("filters-open", false);
  closeSettings();
  closeLogout();
  const scroller = screens[screen].querySelector(".app-scroll, .animal-scroll");
  if (scroller) scroller.scrollTop = 0;
}

function homeScreen() {
  return hasWards ? "dash-wards" : "dash-first";
}

function animalHasTag(animal, selected) {
  const tags = new Set(animal.tags || []);
  if (!(animal.curators || []).length) tags.add("no-curator");
  for (const tag of selected) {
    if (tags.has(tag)) return true;
  }
  return false;
}

function ageBucket(years) {
  if (years >= 1 && years <= 3) return "1-3";
  if (years >= 4 && years <= 10) return "4-10";
  if (years > 10) return "10+";
  return "";
}

function renderShelter() {
  const grid = document.querySelector("#shelter-grid");
  const matches = shelterOrder.filter((id) => {
    const animal = catalog[id];
    if (species !== "all" && animal.kind !== species) return false;
    if (applied.age && ageBucket(animal.years) !== applied.age) return false;
    if (applied.health.size && !applied.health.has(animal.healthKey)) return false;
    if (applied.other.size && !animalHasTag(animal, applied.other)) return false;
    if (applied.full && !animal.fullCare) return false;
    if (shelterQuery && !animal.name.toLowerCase().includes(shelterQuery)) return false;
    return true;
  });
  grid.replaceChildren(
    ...matches.map((id) => {
      const animal = catalog[id];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pet-card";
      button.dataset.open = id;
      button.innerHTML = `<span class="pet-photo"><img src="${animal.photo}" alt="" /></span><span class="pet-info"><span class="pet-name"></span><span class="pet-meta"><span></span><span></span></span></span>`;
      button.querySelector(".pet-name").textContent = animal.name;
      const meta = button.querySelectorAll(".pet-meta span");
      meta[0].textContent = id === "chani" ? "Кішечка" : animal.species;
      meta[1].textContent = animal.ageLabel;
      return button;
    }),
  );
  document.querySelector("#shelter-empty").hidden = matches.length > 0;
}

function renderCurators(ids) {
  const row = document.querySelector("#animal-curators .curators");
  row.replaceChildren(
    ...ids.map((id) => {
      const person = curators[id];
      const item = document.createElement("div");
      item.className = "curator";
      const img = document.createElement("img");
      img.className = person.svg ? "curator-svg" : "curator-photo";
      img.src = person.photo;
      img.alt = "";
      img.width = person.svg ? 56 : 55;
      img.height = 55;
      const name = document.createElement("span");
      name.textContent = person.name;
      item.append(img, name);
      return item;
    }),
  );
}

let animalPhotos = [];
let animalPhotoIndex = 0;

function showAnimalPhotos(photos, name) {
  animalPhotos = photos;
  animalPhotoIndex = 0;
  paintAnimalPhoto(name);
}

function paintAnimalPhoto(name) {
  const photo = document.querySelector("#animal-photo");
  photo.src = animalPhotos[animalPhotoIndex];
  photo.alt = name || "";
  const dots = document.querySelector("#animal-dots");
  dots.hidden = animalPhotos.length < 2;
  dots.replaceChildren(
    ...animalPhotos.map((_, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "photo-dot";
      dot.classList.toggle("is-selected", index === animalPhotoIndex);
      dot.setAttribute("aria-label", `Фото ${index + 1}`);
      dot.addEventListener("click", (event) => {
        event.stopPropagation();
        animalPhotoIndex = index;
        paintAnimalPhoto(name);
      });
      return dot;
    }),
  );
}

function openAnimal(id) {
  const animal = catalog[id];
  if (!animal) return;
  currentAnimal = id;
  showAnimalPhotos(animal.photos?.length ? animal.photos : [animal.cardPhoto], animal.name);
  title.dataset.animalName = animal.name;
  document.querySelector("#fact-species").textContent = animal.species;
  document.querySelector("#fact-age").textContent = animal.ageLabel;
  document.querySelector("#fact-sex-value").textContent = animal.sex;
  document.querySelector("#fact-sex-icon").src = animal.sex === "Дівчинка" ? "/assets/icon-venus.svg" : "/assets/icon-mars.svg";
  document.querySelector("#fact-health-value").textContent = animal.health;
  document.querySelector("#fact-raised").textContent = String(animal.raised);
  document.querySelector("#fact-goal").textContent = `/${animal.goal} грн`;
  document.querySelector(".progress-fill").style.width = `${Math.round((animal.raised / animal.goal) * 100)}%`;
  document.querySelector("#story-lead").textContent = animal.story[0];
  const dream = document.querySelector("#story-dream");
  dream.textContent = animal.story[1] || "";
  dream.hidden = !animal.story[1];
  renderCurators(animal.curators);
  if (current !== "animal") returnScreen = current;
  show("animal");
}

function syncDraftChips() {
  for (const chip of document.querySelectorAll(".filter-chip")) {
    const group = chip.parentElement.dataset.group;
    const value = chip.dataset.value;
    const selected = group === "age" ? draft.age === value : draft[group].has(value);
    chip.classList.toggle("is-selected", selected);
    chip.setAttribute("aria-pressed", String(selected));
  }
  const toggle = document.querySelector("#full-care");
  toggle.classList.toggle("is-on", draft.full);
  toggle.setAttribute("aria-pressed", String(draft.full));
}

let filtersTouched = false;

function openFilters() {
  draft.age = filtersTouched ? applied.age : "4-10";
  draft.health = new Set(applied.health);
  draft.other = new Set(applied.other);
  draft.full = applied.full;
  syncDraftChips();
  document.querySelector("#filters").hidden = false;
  document.querySelector(".phone").classList.add("filters-open");
}

function closeFilters() {
  document.querySelector("#filters").hidden = true;
  document.querySelector(".phone").classList.remove("filters-open");
}

function openSettings() {
  document.querySelector("#settings").hidden = false;
}

function closeSettings() {
  document.querySelector("#settings").hidden = true;
}

function openLogout() {
  document.querySelector("#logout-dialog").hidden = false;
}

function closeLogout() {
  document.querySelector("#logout-dialog").hidden = true;
}

function setMessage(selector, message, success = false) {
  const element = document.querySelector(selector);
  element.hidden = !message;
  element.textContent = message || "";
  element.classList.toggle("is-success", success && Boolean(message));
}

function submitButton(event) {
  return event.submitter || event.currentTarget.querySelector("button[type='submit']");
}

async function post(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "Щось пішло не так");
    error.status = response.status;
    error.unverified = Boolean(data.unverified);
    throw error;
  }
  return data;
}

async function withButton(button, action) {
  button.disabled = true;
  try {
    await action();
  } finally {
    button.disabled = false;
  }
}

document.querySelector("#create-profile").addEventListener("click", () => {
  show("register");
});

document.querySelector("#go-login").addEventListener("click", () => {
  show("login");
});

document.querySelector("#go-forgot").addEventListener("click", () => {
  document.querySelector("#forgot-email").value = document.querySelector("#login-email").value;
  setMessage("#forgot-error", "");
  setMessage("#forgot-status", "");
  show("forgot");
});

document.querySelector("#back-button").addEventListener("click", () => {
  if (current === "reset") {
    history.replaceState(null, "", "/");
  }
  if (current === "animal") {
    show(returnScreen);
    return;
  }
  if (current === "donate") {
    show(donateReturn);
    return;
  }
  if (current === "needs") {
    show(needsReturn);
    return;
  }
  if (current === "test") {
    if (testStep === "results") {
      show("shelter");
      return;
    }
    const previous = { "2": "1", "3": "2", done: "3" };
    if (previous[testStep]) {
      setTestStep(previous[testStep]);
      return;
    }
    show("shelter");
    return;
  }
  if (current === "curate") {
    if (curateStep === "confirm") {
      setCurateStep("amount");
      return;
    }
    if (curateStep === "amount") {
      setCurateStep("type");
      return;
    }
    show(curateReturn);
    return;
  }
  if (current === "terms" || current === "profile-edit" || current === "notices") {
    show(settingsReturn);
    openSettings();
    return;
  }
  show(backTarget[current] || "welcome");
});

screens.register.addEventListener("submit", (event) => {
  event.preventDefault();
  const emailInput = document.querySelector("#register-email");
  const password = document.querySelector("#register-password").value;
  const email = emailInput.value.trim();
  const emailValid = emailPattern.test(email);
  const passwordValid = password.length >= 8;
  emailInput.setAttribute("aria-invalid", String(!emailValid));
  document.querySelector("#register-hint").classList.toggle("is-invalid", !passwordValid);
  setMessage("#register-error", "");
  if (!emailValid || !passwordValid) return;

  withButton(submitButton(event), async () => {
    try {
      await post("/api/register", { email, password });
      pendingEmail = email;
      document.querySelector("#verify-note").textContent = `Ми надіслали код на ${email}. Він діє 15 хвилин.`;
      document.querySelector("#verify-code").value = "";
      setMessage("#verify-error", "");
      show("verify");
    } catch (error) {
      setMessage("#register-error", error.message);
    }
  });
});

screens.verify.addEventListener("submit", (event) => {
  event.preventDefault();
  const code = document.querySelector("#verify-code").value.trim();
  setMessage("#verify-error", "");
  withButton(submitButton(event), async () => {
    try {
      await post("/api/verify", { email: pendingEmail, code });
      show("name");
    } catch (error) {
      setMessage("#verify-error", error.message);
    }
  });
});

document.querySelector("#resend-code").addEventListener("click", (event) => {
  setMessage("#verify-error", "");
  withButton(event.currentTarget, async () => {
    try {
      await post("/api/resend", { email: pendingEmail });
      setMessage("#verify-error", "");
      document.querySelector("#verify-note").textContent = `Новий код надіслано на ${pendingEmail}.`;
    } catch (error) {
      setMessage("#verify-error", error.message);
    }
  });
});

screens.name.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#profile-name").value.trim();
  setMessage("#name-error", "");
  if (!name) {
    setMessage("#name-error", "Введи ім'я.");
    return;
  }
  withButton(submitButton(event), async () => {
    try {
      await post("/api/profile", { name });
      profileName = name;
      document.querySelector("#home-title").textContent = `Привіт, ${name}`;
      show("onboard-curate");
    } catch (error) {
      setMessage("#name-error", error.message);
    }
  });
});

screens.login.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.querySelector("#login-email").value.trim();
  const password = document.querySelector("#login-password").value;
  setMessage("#login-error", "");
  withButton(submitButton(event), async () => {
    try {
      const data = await post("/api/login", { email, password });
      profileName = data.name || "";
      profileEmail = email;
      document.querySelector("#home-title").textContent = profileName ? `Привіт, ${profileName}` : "Привіт";
      show(homeScreen());
    } catch (error) {
      setMessage("#login-error", error.message);
      if (error.unverified) {
        pendingEmail = email;
        document.querySelector("#verify-note").textContent = `Ми вже надсилали код на ${email}. Можеш ввести його або надіслати новий.`;
        show("verify");
      }
    }
  });
});

screens.forgot.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.querySelector("#forgot-email").value.trim();
  setMessage("#forgot-error", "");
  setMessage("#forgot-status", "");
  withButton(submitButton(event), async () => {
    try {
      const data = await post("/api/forgot", { email });
      setMessage("#forgot-status", data.message);
    } catch (error) {
      setMessage("#forgot-error", error.message);
    }
  });
});

screens.reset.addEventListener("submit", (event) => {
  event.preventDefault();
  const password = document.querySelector("#reset-password").value;
  setMessage("#reset-error", "");
  setMessage("#reset-status", "");
  if (password.length < 8) {
    setMessage("#reset-error", "Пароль має містити не менше 8 символів");
    return;
  }
  withButton(submitButton(event), async () => {
    try {
      await post("/api/reset", { token: resetToken, password });
      history.replaceState(null, "", "/");
      document.querySelector("#login-password").value = "";
      show("login");
      setMessage("#login-error", "Пароль оновлено. Тепер можна увійти.", true);
    } catch (error) {
      setMessage("#reset-error", error.message);
    }
  });
});

async function logout(button) {
  await withButton(button, () => post("/api/logout", {}));
  show("welcome");
}

document.querySelector("#logout").addEventListener("click", (event) => {
  logout(event.currentTarget);
});

document.querySelector("#settings-logout").addEventListener("click", openLogout);

document.querySelector("#logout-confirm").addEventListener("click", (event) => {
  logout(event.currentTarget);
});

document.querySelector("#logout-cancel").addEventListener("click", closeLogout);
document.querySelector("#logout-dismiss").addEventListener("click", closeLogout);

document.querySelector("#notices").addEventListener("click", (event) => {
  const toggle = event.target.closest(".switch");
  if (!toggle) return;
  const on = !toggle.classList.contains("is-on");
  toggle.classList.toggle("is-on", on);
  toggle.setAttribute("aria-pressed", String(on));
});

document.querySelectorAll(".open-settings").forEach((button) => {
  button.addEventListener("click", openSettings);
});

function resetDonate() {
  document.querySelectorAll(".amount-option").forEach((button) => button.classList.remove("is-selected"));
  document.querySelector("#custom-amount").value = "";
  document.querySelector("#donate-next").disabled = true;
}

function openDonate() {
  donateReturn = current;
  resetDonate();
  show("donate");
}

document.querySelectorAll(".open-donate").forEach((button) => {
  button.addEventListener("click", openDonate);
});

function openNeeds() {
  needsReturn = current;
  show("needs");
}

document.querySelectorAll(".open-needs").forEach((button) => {
  button.addEventListener("click", openNeeds);
});

document.querySelector(".need-list").addEventListener("click", (event) => {
  const row = event.target.closest(".need-row");
  if (!row) return;
  const item = row.parentElement;
  const open = item.classList.contains("is-open");
  document.querySelectorAll(".need-item").forEach((card) => card.classList.remove("is-open"));
  item.classList.toggle("is-open", !open);
});

document.querySelector(".amount-grid").addEventListener("click", (event) => {
  const option = event.target.closest("[data-amount]");
  if (!option) return;
  document.querySelectorAll(".amount-option").forEach((button) => {
    button.classList.toggle("is-selected", button === option);
  });
  document.querySelector("#custom-amount").value = "";
  document.querySelector("#donate-next").disabled = false;
});

document.querySelector("#custom-amount").addEventListener("input", (event) => {
  const digits = event.target.value.replace(/\D/g, "");
  event.target.value = digits;
  document.querySelectorAll(".amount-option").forEach((button) => button.classList.remove("is-selected"));
  document.querySelector("#donate-next").disabled = digits.length === 0;
});

function fillProfileForm() {
  document.querySelector("#edit-name").value = profileName || "Оля";
  document.querySelector("#edit-email").value = profileEmail;
  document.querySelector("#edit-phone").value = profilePhone;
  setMessage("#profile-edit-error", "");
}

document.querySelector("#settings").addEventListener("click", (event) => {
  const row = event.target.closest("[data-settings]");
  if (!row) return;
  settingsReturn = current;
  if (row.dataset.settings === "profile-edit") fillProfileForm();
  show(row.dataset.settings);
});

document.querySelector("#avatar-input").addEventListener("change", (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const preview = document.querySelector("#avatar-preview");
  const image = preview.querySelector("img");
  image.src = URL.createObjectURL(file);
  image.classList.remove("is-icon");
  image.alt = "Фото профілю";
});

document.querySelector("#profile-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#edit-name").value.trim();
  setMessage("#profile-edit-error", "");
  if (!name) {
    setMessage("#profile-edit-error", "Введи ім'я.");
    return;
  }
  profileName = name;
  profileEmail = document.querySelector("#edit-email").value.trim();
  profilePhone = document.querySelector("#edit-phone").value.trim();
  document.querySelector("#home-title").textContent = `Привіт, ${name}`;
  withButton(submitButton(event), async () => {
    try {
      await post("/api/profile", { name });
    } catch (error) {
      const offline = String(error.message || "").includes("пошту");
      if (!offline) {
        setMessage("#profile-edit-error", error.message);
        return;
      }
    }
    show(settingsReturn);
    openSettings();
  });
});

document.querySelector("#settings-close").addEventListener("click", closeSettings);

document.querySelectorAll("[data-next]").forEach((button) => {
  button.addEventListener("click", () => show(button.dataset.next));
});

document.addEventListener("click", (event) => {
  const open = event.target.closest("[data-open]");
  if (open) {
    openAnimal(open.dataset.open);
    return;
  }
  const tab = event.target.closest("[data-go]");
  if (!tab) return;
  const destination = tab.dataset.go;
  if (destination === "shelter") {
    show("shelter");
    return;
  }
  if (destination === "wards") {
    show("my-animals");
    return;
  }
  if (destination === "help") {
    show("help");
    return;
  }
  show(homeScreen());
});

document.querySelector("#shelter-search").addEventListener("input", (event) => {
  shelterQuery = event.target.value.trim().toLowerCase();
  renderShelter();
});

document.querySelector("#species-row").addEventListener("click", (event) => {
  const chip = event.target.closest("[data-species]");
  if (!chip) return;
  species = chip.dataset.species;
  for (const item of document.querySelectorAll("#species-row .species")) {
    item.classList.toggle("is-active", item === chip);
  }
  renderShelter();
});

document.querySelector("#open-filters").addEventListener("click", openFilters);
document.querySelector("#filters-close").addEventListener("click", closeFilters);

document.querySelector("#filters").addEventListener("click", (event) => {
  const chip = event.target.closest(".filter-chip");
  if (!chip) return;
  const group = chip.parentElement.dataset.group;
  const value = chip.dataset.value;
  if (group === "age") {
    draft.age = draft.age === value ? "" : value;
  } else if (draft[group].has(value)) {
    draft[group].delete(value);
  } else {
    draft[group].add(value);
  }
  syncDraftChips();
});

document.querySelector("#filters-clear").addEventListener("click", () => {
  draft.age = "";
  draft.health.clear();
  draft.other.clear();
  draft.full = false;
  syncDraftChips();
});

document.querySelector("#full-care").addEventListener("click", () => {
  draft.full = !draft.full;
  syncDraftChips();
});

document.querySelector("#filters-apply").addEventListener("click", () => {
  filtersTouched = true;
  applied.age = draft.age;
  applied.health = new Set(draft.health);
  applied.other = new Set(draft.other);
  applied.full = draft.full;
  closeFilters();
  renderShelter();
});

function setCurateStep(step) {
  curateStep = step;
  document.querySelectorAll("[data-curate-step]").forEach((panel) => {
    panel.hidden = panel.dataset.curateStep !== step;
  });
}

function applyCurateAmount(amount) {
  curateAmount = amount;
  const custom = document.querySelector("#curate-custom");
  const preset = document.querySelector(`#curate-amounts [data-amount="${amount}"]`);
  document.querySelectorAll("#curate-amounts .amount-option").forEach((button) => {
    button.classList.toggle("is-selected", button === preset);
  });
  custom.value = preset ? "" : amount;
  document.querySelector("#curate-amount-next").disabled = !amount;
}

function fillCurateConfirm() {
  const animal = catalog[currentAnimal];
  document.querySelector("#curate-photo").src = animal.photo;
  document.querySelector("#curate-name").textContent = animal.name;
  document.querySelector("#curate-species").textContent = animal.species;
  document.querySelector("#curate-type-value").textContent = curateType === "part" ? "Часткове" : "Повне";
  document.querySelector("#curate-sum-value").textContent = `${curateAmount} грн`;
  document.querySelector("#curate-total").textContent = `${curateAmount} грн`;
}

function setTestStep(step) {
  testStep = step;
  document.querySelectorAll("[data-test-step]").forEach((panel) => {
    panel.hidden = panel.dataset.testStep !== step;
  });
  if (current === "test") title.textContent = step === "results" ? "Рекомендовані тварини" : "Тест";
}

function openTest() {
  testAnswers.care = "";
  testAnswers.age = "";
  testAnswers.kind = "";
  document.querySelectorAll(".quiz-option").forEach((option) => option.classList.remove("is-selected"));
  document.querySelectorAll(".quiz-next").forEach((button) => {
    button.disabled = true;
  });
  show("test");
  setTestStep("1");
}

document.querySelector(".open-test").addEventListener("click", openTest);

document.querySelector("#test").addEventListener("click", (event) => {
  const option = event.target.closest(".quiz-option");
  if (!option) return;
  const group = option.parentElement;
  group.querySelectorAll(".quiz-option").forEach((item) => item.classList.toggle("is-selected", item === option));
  testAnswers[group.dataset.question] = option.dataset.value;
  group.parentElement.querySelector(".quiz-next").disabled = false;
});

document.querySelectorAll(".quiz-next").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.disabled) return;
    setTestStep(button.dataset.nextStep);
  });
});

document.querySelector("#test-results").addEventListener("click", () => setTestStep("results"));

document.querySelector("#become-curator").addEventListener("click", () => {
  curateReturn = current;
  curateType = "";
  curateAmount = "";
  document.querySelectorAll(".type-card").forEach((card) => card.classList.remove("is-selected"));
  document.querySelector("#curate-type-next").disabled = true;
  applyCurateAmount("");
  setCurateStep("type");
  show("curate");
});

document.querySelector(".type-grid").addEventListener("click", (event) => {
  const card = event.target.closest("[data-type]");
  if (!card) return;
  curateType = card.dataset.type;
  document.querySelectorAll(".type-card").forEach((item) => item.classList.toggle("is-selected", item === card));
  document.querySelector("#curate-type-next").disabled = false;
});

document.querySelector("#curate-type-next").addEventListener("click", () => {
  if (!curateType) return;
  applyCurateAmount(curateType === "part" ? "50" : "500");
  setCurateStep("amount");
});

document.querySelector("#curate-amounts").addEventListener("click", (event) => {
  const option = event.target.closest("[data-amount]");
  if (!option) return;
  applyCurateAmount(option.dataset.amount);
});

document.querySelector("#curate-custom").addEventListener("input", (event) => {
  const digits = event.target.value.replace(/\D/g, "");
  event.target.value = digits;
  document.querySelectorAll("#curate-amounts .amount-option").forEach((button) => button.classList.remove("is-selected"));
  curateAmount = digits;
  document.querySelector("#curate-amount-next").disabled = digits.length === 0;
});

document.querySelector("#curate-amount-next").addEventListener("click", () => {
  if (!curateAmount) return;
  fillCurateConfirm();
  setCurateStep("confirm");
});

const gallery = document.querySelector("#animal-gallery");
let photoSwipe = null;
gallery.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".photo-dot")) return;
  photoSwipe = { x: event.clientX, y: event.clientY };
});
gallery.addEventListener("pointerup", (event) => {
  if (!photoSwipe || animalPhotos.length < 2) {
    photoSwipe = null;
    return;
  }
  const dx = event.clientX - photoSwipe.x;
  const dy = event.clientY - photoSwipe.y;
  photoSwipe = null;
  if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
  animalPhotoIndex = (animalPhotoIndex + (dx < 0 ? 1 : animalPhotos.length - 1)) % animalPhotos.length;
  paintAnimalPhoto(document.querySelector("#animal-photo").alt);
});

document.querySelector("#curate-finish").addEventListener("click", () => {
  hasWards = true;
  show("dash-wards");
});

renderShelter();
loadAddedAnimals();

async function loadAddedAnimals() {
  try {
    const response = await fetch("/api/animals");
    if (!response.ok) return;
    const data = await response.json();
    for (const animal of data.animals || []) {
      catalog[animal.id] = animal;
      if (!shelterOrder.includes(animal.id)) shelterOrder.push(animal.id);
    }
    renderShelter();
  } catch {
    // The shelter still shows the built-in animals when the list cannot be loaded.
  }
}

const phone = document.querySelector(".phone");

function fitPhone() {
  if (window.innerWidth <= 440) {
    phone.style.transform = "";
    return;
  }
  const scale = Math.min(1, (window.innerHeight - 32) / 874, (window.innerWidth - 32) / 402);
  phone.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

fitPhone();
window.addEventListener("resize", fitPhone);

for (const toggle of document.querySelectorAll("[data-toggle-password]")) {
  toggle.addEventListener("change", () => {
    const field = document.querySelector(`#${toggle.dataset.togglePassword}`);
    field.type = toggle.checked ? "text" : "password";
  });
}

if (resetToken) show("reset");
