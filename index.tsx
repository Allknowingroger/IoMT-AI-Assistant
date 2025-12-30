import { GoogleGenAI } from "@google/genai";

// DOM element references
const chatLog = document.getElementById('chat-log') as HTMLDivElement;
const questionInput = document.getElementById('question-input') as HTMLInputElement;
const askButton = document.getElementById('ask-button') as HTMLButtonElement;
const loader = document.getElementById('loader') as HTMLDivElement;
const loaderText = document.getElementById('loader-text') as HTMLParagraphElement;
const errorMessage = document.getElementById('error-message') as HTMLDivElement;

const imagePromptInput = document.getElementById('image-prompt-input') as HTMLInputElement;
const generateImageButton = document.getElementById('generate-image-button') as HTMLButtonElement;
const imageLoader = document.getElementById('image-loader') as HTMLDivElement;
const imageContainer = document.getElementById('image-container') as HTMLDivElement;
const imageErrorMessage = document.getElementById('image-error-message') as HTMLDivElement;

// System Status Elements
const uptimeEl = document.getElementById('system-uptime');
const latencyEl = document.getElementById('system-latency');

let ai: GoogleGenAI;
let chatSession: any;

const LOADING_MESSAGES = [
  "Initializing Satellite Link...",
  "Processing SIGINT Feed...",
  "Decrypting Classified Assets...",
  "Analyzing Battlefield Metrics...",
  "Syncing Tactical Grid..."
];

function updateSystemStatus() {
  if (uptimeEl) uptimeEl.textContent = `${Math.floor(performance.now() / 1000)}s`;
  if (latencyEl) latencyEl.textContent = `${Math.round(Math.random() * 50 + 10)}ms`;
}
setInterval(updateSystemStatus, 1000);

try {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  chatSession = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: "You are the IoMT Tactical Assistant (Code-name: INTEL). You specialize in the Internet of Military Things, providing strategic, technical, and logistical analysis. Be professional, concise, and use military terminology. When possible, cite real-world defense programs.",
      tools: [{ googleSearch: {} }]
    }
  });
} catch (e) {
  console.error("Initialization error:", e);
}

// === Chat Functions ===

function appendMessage(role: 'user' | 'model', text: string, sources?: any[]) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-message ${role}-message`;
  
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const senderName = role === 'user' ? 'OPERATOR' : 'INTEL_FEED';
  
  let contentHtml = `
    <div class="msg-header">
      <span class="msg-sender">[ ${senderName} ]</span>
      <span class="msg-time">${timestamp}</span>
    </div>
    <div class="msg-content">${text}</div>
  `;

  if (sources && sources.length > 0) {
    contentHtml += `
      <div class="msg-sources">
        <span class="sources-label">Intelligence Sources:</span>
        <div class="sources-list">
          ${sources.map(s => `<a href="${s.web?.uri || '#'}" target="_blank" rel="noopener">${s.web?.title || 'Defense Source'}</a>`).join('')}
        </div>
      </div>
    `;
  }

  msgDiv.innerHTML = contentHtml;
  chatLog.appendChild(msgDiv);
  chatLog.scrollTop = chatLog.scrollHeight;
  return msgDiv.querySelector('.msg-content');
}

async function handleChat() {
  const prompt = questionInput.value.trim();
  if (!prompt || !chatSession) return;

  questionInput.value = '';
  appendMessage('user', prompt);
  
  loader.style.display = 'block';
  askButton.disabled = true;
  errorMessage.style.display = 'none';

  let currentMsgIndex = 0;
  const messageInterval = setInterval(() => {
    loaderText.textContent = LOADING_MESSAGES[currentMsgIndex % LOADING_MESSAGES.length];
    currentMsgIndex++;
  }, 1500);

  try {
    const result = await chatSession.sendMessageStream({ message: prompt });
    const contentTarget = appendMessage('model', '');
    let fullText = '';
    let sources: any[] = [];

    for await (const chunk of result) {
      const text = chunk.text;
      fullText += text;
      if (contentTarget) contentTarget.textContent = fullText;
      
      // Check for grounding metadata
      const chunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) sources = [...sources, ...chunks];
    }

    // Refresh display with markdown/links if needed (simulated here)
    if (sources.length > 0 && contentTarget) {
      const parent = contentTarget.parentElement?.parentElement;
      if (parent) {
         const sourcesDiv = document.createElement('div');
         sourcesDiv.className = 'msg-sources';
         sourcesDiv.innerHTML = `
           <span class="sources-label">Intelligence Sources:</span>
           <div class="sources-list">
             ${sources.map(s => s.web ? `<a href="${s.web.uri}" target="_blank">${s.web.title}</a>` : '').filter(Boolean).join('')}
           </div>
         `;
         parent.appendChild(sourcesDiv);
      }
    }

  } catch (error) {
    console.error("Chat error:", error);
    errorMessage.textContent = "Transmission failed. Check secure channel.";
    errorMessage.style.display = 'block';
  } finally {
    clearInterval(messageInterval);
    loader.style.display = 'none';
    askButton.disabled = false;
    chatLog.scrollTop = chatLog.scrollHeight;
  }
}

// === Image Generation ===

async function generateTacticalImage() {
  const prompt = imagePromptInput.value.trim();
  if (!prompt || !ai) return;

  imageLoader.style.display = 'block';
  generateImageButton.disabled = true;
  imageErrorMessage.style.display = 'none';
  imageContainer.innerHTML = '';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Tactical military concept art: ${prompt}. Cinematic lighting, realistic, high detail.` }] },
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    });

    let foundImage = false;
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const img = document.createElement('img');
        img.src = `data:image/png;base64,${part.inlineData.data}`;
        img.alt = prompt;
        img.className = "tactical-render";
        imageContainer.appendChild(img);
        foundImage = true;
      }
    }
    if (!foundImage) throw new Error("No imagery in payload");

  } catch (error) {
    console.error("Image error:", error);
    imageErrorMessage.textContent = "Imaging system offline. Retry.";
    imageErrorMessage.style.display = 'block';
  } finally {
    imageLoader.style.display = 'none';
    generateImageButton.disabled = false;
  }
}

// Event Listeners
askButton.addEventListener('click', handleChat);
questionInput.addEventListener('keydown', (e) => e.key === 'Enter' && handleChat());
generateImageButton.addEventListener('click', generateTacticalImage);
imagePromptInput.addEventListener('keydown', (e) => e.key === 'Enter' && generateTacticalImage());
