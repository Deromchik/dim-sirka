const form = document.querySelector("#animal-form");
const stage = document.querySelector("#photo-stage");
const tools = document.querySelector("#photo-tools");
const strip = document.querySelector("#photo-strip");
const photoInput = document.querySelector("#photo");
const zoomInput = document.querySelector("#zoom");
const errorBox = document.querySelector("#form-error");
const list = document.querySelector("#animal-list");
const state = { kind: "dog", sex: "Хлопчик", healthKey: "healthy", tags: new Set() };
const photos = [];
let selected = 0;
let drag = null;

function fitDesktop() {
  const wide = window.innerWidth >= 960;
  document.querySelector("#admin-app").hidden = !wide;
  document.querySelector("#desktop-only").hidden = wide;
}

fitDesktop();
window.addEventListener("resize", fitDesktop);

document.querySelector("#photo-add").addEventListener("click", () => photoInput.click());

photoInput.addEventListener("change", () => {
  const files = [...(photoInput.files || [])];
  photoInput.value = "";
  for (const file of files) addPhoto(file);
});

function addPhoto(file) {
  if (photos.length >= 8) {
    showError("Можна додати не більше восьми фото.");
    return;
  }
  const image = new Image();
  image.onload = () => {
    photos.push({ id: `photo-${Date.now().toString(36)}-${photos.length}`, image, x: 0, y: 0, scale: 1 });
    selected = photos.length - 1;
    errorBox.hidden = true;
    renderPhotos();
  };
  image.src = URL.createObjectURL(file);
}

function currentPhoto() {
  return photos[selected];
}

function frameSize() {
  return stage.clientWidth;
}

function metrics(photo) {
  const frame = frameSize();
  const cover = Math.max(frame / photo.image.naturalWidth, frame / photo.image.naturalHeight) * photo.scale;
  return {
    frame,
    cover,
    displayW: photo.image.naturalWidth * cover,
    displayH: photo.image.naturalHeight * cover,
  };
}

function clamp(photo) {
  const { frame, displayW, displayH } = metrics(photo);
  const maxX = Math.max(0, (displayW - frame) / 2);
  const maxY = Math.max(0, (displayH - frame) / 2);
  photo.x = Math.min(maxX, Math.max(-maxX, photo.x));
  photo.y = Math.min(maxY, Math.max(-maxY, photo.y));
}

function renderPhotos() {
  const photo = currentPhoto();
  stage.querySelector("img")?.remove();
  document.querySelector("#photo-add").hidden = photos.length > 0;
  tools.hidden = !photo;
  stage.classList.toggle("is-filled", Boolean(photo));
  if (!photo) {
    strip.replaceChildren();
    return;
  }
  clamp(photo);
  const { frame, displayW, displayH } = metrics(photo);
  const image = document.createElement("img");
  image.src = photo.image.src;
  image.alt = "";
  image.draggable = false;
  image.style.width = `${displayW}px`;
  image.style.height = `${displayH}px`;
  image.style.left = `${(frame - displayW) / 2 + photo.x}px`;
  image.style.top = `${(frame - displayH) / 2 + photo.y}px`;
  stage.append(image);
  zoomInput.value = String(photo.scale);

  strip.replaceChildren();
  photos.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "photo-thumb";
    button.classList.toggle("is-selected", index === selected);
    button.append(thumbnail(item));
    button.addEventListener("click", () => {
      selected = index;
      renderPhotos();
    });
    strip.append(button);
  });
  const add = document.createElement("button");
  add.type = "button";
  add.className = "thumb-add";
  add.textContent = "+";
  add.setAttribute("aria-label", "Додати фото");
  add.addEventListener("click", () => photoInput.click());
  strip.append(add);
}

function thumbnail(photo) {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const cover = Math.max(size / photo.image.naturalWidth, size / photo.image.naturalHeight) * photo.scale;
  const displayW = photo.image.naturalWidth * cover;
  const displayH = photo.image.naturalHeight * cover;
  const ratio = size / frameSize();
  const ctx = canvas.getContext("2d");
  ctx.drawImage(photo.image, (size - displayW) / 2 + photo.x * ratio, (size - displayH) / 2 + photo.y * ratio, displayW, displayH);
  return canvas;
}

stage.addEventListener("pointerdown", (event) => {
  const photo = currentPhoto();
  if (!photo || event.target.closest("button")) return;
  drag = { id: photo.id, x: event.clientX, y: event.clientY, ox: photo.x, oy: photo.y };
  stage.classList.add("is-dragging");
  stage.setPointerCapture(event.pointerId);
});

stage.addEventListener("pointermove", (event) => {
  const photo = currentPhoto();
  if (!drag || !photo || photo.id !== drag.id) return;
  photo.x = drag.ox + (event.clientX - drag.x);
  photo.y = drag.oy + (event.clientY - drag.y);
  clamp(photo);
  renderPhotos();
});

function endDrag() {
  drag = null;
  stage.classList.remove("is-dragging");
}

stage.addEventListener("pointerup", endDrag);
stage.addEventListener("pointercancel", endDrag);

stage.addEventListener(
  "wheel",
  (event) => {
    const photo = currentPhoto();
    if (!photo) return;
    event.preventDefault();
    setScale(photo.scale + (event.deltaY < 0 ? 0.08 : -0.08));
  },
  { passive: false },
);

zoomInput.addEventListener("input", () => setScale(Number(zoomInput.value)));
document.querySelector("#zoom-in").addEventListener("click", () => setScale((currentPhoto()?.scale || 1) + 0.15));
document.querySelector("#zoom-out").addEventListener("click", () => setScale((currentPhoto()?.scale || 1) - 0.15));
document.querySelector("#photo-remove").addEventListener("click", () => {
  photos.splice(selected, 1);
  selected = Math.max(0, selected - 1);
  renderPhotos();
});

function setScale(value) {
  const photo = currentPhoto();
  if (!photo) return;
  photo.scale = Math.min(3, Math.max(1, value));
  clamp(photo);
  renderPhotos();
}

function crop(photo) {
  const size = 900;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const { frame, cover } = metrics(photo);
  const ratio = size / frame;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    photo.image,
    ((frame - photo.image.naturalWidth * cover) / 2 + photo.x) * ratio,
    ((frame - photo.image.naturalHeight * cover) / 2 + photo.y) * ratio,
    photo.image.naturalWidth * cover * ratio,
    photo.image.naturalHeight * cover * ratio,
  );
  return canvas.toDataURL("image/jpeg", 0.86);
}

form.addEventListener("click", (event) => {
  const chip = event.target.closest(".chip");
  if (!chip) return;
  const field = chip.parentElement.dataset.field;
  const value = chip.dataset.value;
  if (field === "tags") {
    if (state.tags.has(value)) state.tags.delete(value);
    else state.tags.add(value);
    chip.classList.toggle("is-selected", state.tags.has(value));
    return;
  }
  state[field] = value;
  for (const button of chip.parentElement.querySelectorAll(".chip")) {
    button.classList.toggle("is-selected", button === chip);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.hidden = true;
  const years = Number(String(form.years.value).replace(",", "."));
  const goal = Number(form.goal.value);
  if (!photos.length) return showError("Додай хоча б одне фото.");
  if (!form.name.value.trim() || !Number.isFinite(years) || years <= 0) return showError("Вкажи ім’я і вік у роках.");
  if (!Number.isFinite(goal) || goal <= 0) return showError("Вкажи ціль збору.");

  const submit = form.querySelector(".submit");
  submit.disabled = true;
  try {
    const response = await fetch("/api/animals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        photos: photos.map(crop),
        name: form.name.value.trim(),
        kind: state.kind,
        sex: state.sex,
        years,
        healthKey: state.healthKey,
        goal,
        tags: [...state.tags],
        fullCare: form.querySelector("#full-care").checked,
        storyLead: form.querySelector("#story-lead").value.trim(),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      showError(data.error || "Не вдалося зберегти.");
      return;
    }
    form.reset();
    state.kind = "dog";
    state.sex = "Хлопчик";
    state.healthKey = "healthy";
    state.tags.clear();
    photos.splice(0, photos.length);
    selected = 0;
    renderPhotos();
    for (const chip of form.querySelectorAll(".chip")) {
      const field = chip.parentElement.dataset.field;
      const chosen = field === "tags" ? false : chip.dataset.value === state[field];
      chip.classList.toggle("is-selected", chosen);
    }
    await loadAnimals();
  } catch {
    showError("Немає зв’язку з сервером.");
  } finally {
    submit.disabled = false;
  }
});

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

async function loadAnimals() {
  const response = await fetch("/api/animals");
  const data = await response.json();
  const animals = data.animals || [];
  list.replaceChildren();
  if (!animals.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Ще немає доданих тваринок. Перша опублікована з’явиться тут і в притулку.";
    list.append(empty);
    return;
  }
  for (const animal of animals) {
    const row = document.createElement("article");
    row.className = "animal-row";
    const image = document.createElement("img");
    image.src = animal.photo;
    image.alt = "";
    const text = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = animal.name;
    const meta = document.createElement("span");
    meta.textContent = `${animal.species} · ${animal.ageLabel} · ${animal.health}`;
    text.append(name, meta);
    row.append(image, text);
    list.append(row);
  }
}

loadAnimals();
