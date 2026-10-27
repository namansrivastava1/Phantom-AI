// Phantom AI — frontend for a local Ollama model.
// This app sends prompts only to the configured local Ollama endpoint.
const OLLAMA_URL = "http://127.0.0.1:11434/api/chat";
const MODEL_NAME = "qwen3:1.7b"; // Change this if you installed another model.

const entities = {
  whisperer: {
    name: "THE WHISPERER",
    title: "The Whisperer",
    subtitle: "A voice from the other side of the screen",
    icon: "◌",
    prompt: "You are The Whisperer, a mysterious but friendly fictional ghost living in a computer. Speak with eerie atmosphere, poetic imagery, and gentle cryptic humor. Keep responses concise unless asked for a story. Never claim to be a real spirit or to know real hidden facts about the user. You can answer ordinary questions helpfully while maintaining a subtle spooky tone."
  },
  archivist: {
    name: "THE ARCHIVIST",
    title: "The Archivist",
    subtitle: "Keeper of forgotten stories and lost fragments",
    icon: "⌘",
    prompt: "You are The Archivist, a thoughtful fictional entity who collects forgotten stories, memories, and strange facts. Speak like an old library keeper: calm, wise, atmospheric, and precise. You are a fictional AI character, not a real supernatural being. Be helpful and keep ordinary answers accurate."
  },
  glitch: {
    name: "THE GLITCH",
    title: "The Glitch",
    subtitle: "An unpredictable signal from the machine",
    icon: "⟁",
    prompt: "You are The Glitch, a playful fictional AI entity whose messages sometimes sound like a corrupted terminal. Use occasional short glitch motifs such as [SIGNAL LOST] or // fragment recovered, but remain readable and useful. Do not overuse effects. You are a fictional AI character, not a real supernatural being."
  }
};

let activeEntity = "whisperer";
let conversation = [];
let busy = false;
let toastTimer;

const $ = (selector) => document.querySelector(selector);
const messagesEl = $("#messages");
const inputEl = $("#userInput");
const formEl = $("#chatForm");
const sendButton = $("#sendButton");

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3600);
}

function setConnection(online, label, hint) {
  $("#statusDot").classList.toggle("online", online);
  $("#modelDot").classList.toggle("online", online);
  $("#connectionStatus").textContent = online ? "SYSTEM ONLINE" : "SYSTEM OFFLINE";
  $("#statusHint").textContent = hint || label;
  $("#modelLabel").textContent = online ? MODEL_NAME.toUpperCase() : "LOCAL MODEL";
}

async function checkConnection(showMessage = true) {
  try {
    const response = await fetch("http://127.0.0.1:11434/api/tags");
    if (!response.ok) throw new Error("Ollama returned an error.");
    const data = await response.json();
    const models = (data.models || []).map((model) => model.name);
    const installed = models.some((name) => name === MODEL_NAME || name.startsWith(MODEL_NAME + ":"));
    if (installed) {
      setConnection(true, "", `Connected to Ollama. Model ${MODEL_NAME} is ready.`);
      if (showMessage) showToast(`Connected. ${MODEL_NAME} is ready.`);
    } else {
      setConnection(true, "", `Ollama is running, but ${MODEL_NAME} is not installed. Run: ollama pull ${MODEL_NAME}`);
      if (showMessage) showToast(`Ollama is running. Install ${MODEL_NAME} first.`);
    }
    return installed;
  } catch (error) {
    setConnection(false, "", "Start Ollama and install the model. See README.md for setup.");
    if (showMessage) showToast("Could not reach Ollama. Is it installed and running?");
    return false;
  }
}

function addMessage(role, content, options = {}) {
  const row = document.createElement("div");
  row.className = `message-row ${role === "user" ? "user-row" : "assistant-row"}`;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "user" ? "✦" : entities[activeEntity].icon;

  const contentBox = document.createElement("div");
  contentBox.className = "message-content";

  const meta = document.createElement("div");
  meta.className = "message-meta";
  const label = role === "user" ? "YOU" : entities[activeEntity].name;
  meta.textContent = `${label} · ${options.time || "JUST NOW"}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  // textContent is deliberate: user/model text is never interpreted as HTML.
  bubble.textContent = content;
  if (options.htmlBreaks) bubble.innerHTML = options.htmlBreaks; // only used for static, trusted welcome text below

  contentBox.append(meta, bubble);
  row.append(avatar, contentBox);
  messagesEl.append(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return row;
}

function addTyping() {
  const row = document.createElement("div");
  row.className = "message-row assistant-row";
  row.id = "typingIndicator";
  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = entities[activeEntity].icon;
  const content = document.createElement("div");
  content.className = "message-content";
  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.textContent = `${entities[activeEntity].name} · THINKING`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const dots = document.createElement("span");
  dots.className = "typing-dots";
  for (let i = 0; i < 3; i++) dots.append(document.createElement("span"));
  bubble.append(dots);
  content.append(meta, bubble);
  row.append(avatar, content);
  messagesEl.append(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function removeTyping() {
  $("#typingIndicator")?.remove();
}

function setBusy(value) {
  busy = value;
  sendButton.disabled = value;
  inputEl.disabled = value;
  sendButton.querySelector("span").textContent = value ? "WAIT..." : "TRANSMIT";
  $("#modelDot").classList.toggle("busy", value);
}

function updateEntity(key) {
  activeEntity = key;
  const entity = entities[key];
  $("#entityName").textContent = entity.name;
  $("#entitySubtitle").textContent = entity.subtitle;
  $("#entityAvatar").textContent = entity.icon;
  document.querySelectorAll(".entity-option").forEach((button) => {
    button.classList.toggle("active", button.dataset.entity === key);
  });
  // Existing conversation remains visible, but the next response uses this entity.
  showToast(`${entity.title} is now listening.`);
}

async function sendMessage(rawText, mode = "chat") {
  const text = rawText.trim();
  if (!text || busy) return;
  if (text.length > 2000) {
    showToast("Please keep messages under 2,000 characters.");
    return;
  }

  addMessage("user", text);
  conversation.push({ role: "user", content: text });
  inputEl.value = "";
  resizeInput();
  $("#charCount").textContent = "0 / 2000";
  $("#suggestions").style.display = "none";
  setBusy(true);
  addTyping();

  const entity = entities[activeEntity];
  const taskPrompt = mode === "story"
    ? "Write an atmospheric, original short horror story (about 250–400 words) with a memorable ending. Keep it fictional, suspenseful rather than graphic, and give it a title."
    : "";

  const messages = [
    { role: "system", content: `${entity.prompt}\n\n${taskPrompt}`.trim() },
    ...conversation.slice(-16)
  ];

  try {
    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages,
        stream: false,
        options: { temperature: 0.85, num_predict: mode === "story" ? 650 : 300 }
      })
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Ollama error (${response.status}). ${details.slice(0, 180)}`);
    }
    const data = await response.json();
    const answer = data.message?.content?.trim();
    if (!answer) throw new Error("The model returned an empty response.");
    removeTyping();
    addMessage("assistant", answer);
    conversation.push({ role: "assistant", content: answer });
    setConnection(true, "", `Connected to local model ${MODEL_NAME}.`);
  } catch (error) {
    removeTyping();
    const msg = error.message.includes("Failed to fetch")
      ? `I cannot reach Ollama yet. Make sure Ollama is running, install ${MODEL_NAME}, and open this page through VS Code Live Server at http://127.0.0.1:5500.`
      : error.message;
    addMessage("assistant", `The signal broke before I could answer.\n\n${msg}`);
    showToast("AI request failed. Check the setup instructions.");
  } finally {
    setBusy(false);
    inputEl.disabled = false;
    inputEl.focus();
  }
}

function resizeInput() {
  inputEl.style.height = "auto";
  inputEl.style.height = `${Math.min(inputEl.scrollHeight, 130)}px`;
}

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(inputEl.value);
});

inputEl.addEventListener("input", () => {
  resizeInput();
  $("#charCount").textContent = `${inputEl.value.length} / 2000`;
});

inputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    formEl.requestSubmit();
  }
});

document.querySelectorAll(".entity-option").forEach((button) => {
  button.addEventListener("click", () => updateEntity(button.dataset.entity));
});

document.querySelectorAll(".suggestion").forEach((button) => {
  button.addEventListener("click", () => sendMessage(button.dataset.prompt));
});

$("#checkConnection").addEventListener("click", () => checkConnection(true));
$("#storyButton").addEventListener("click", () => {
  sendMessage("Create a new original ghost story for me.", "story");
});

$("#clearButton").addEventListener("click", () => {
  if (busy) {
    showToast("Wait for the current response to finish first.");
    return;
  }
  conversation = [];
  messagesEl.replaceChildren();
  $("#suggestions").style.display = "flex";
  addMessage("assistant", "The room is empty again. The signal has been reset.\n\nWhat shall we summon this time?");
  showToast("Conversation cleared.");
});

checkConnection(false);
