const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/gpt2';
const HUGGINGFACE_API_TOKEN = ''; // Opcional: añade aquí tu token de Hugging Face si dispones de uno

const conversationState = {
  messages: []
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('chatForm');
  const input = document.getElementById('userInput');
  const sendButton = document.getElementById('sendButton');
  const conversation = document.getElementById('conversation');

  function appendMessage(role, content) {
    const wrapper = document.createElement('article');
    wrapper.className = `message ${role}`;

    const author = document.createElement('span');
    author.className = 'author';
    author.textContent = role === 'user' ? 'Tú' : 'Asistente';

    const body = document.createElement('p');
    body.className = 'content';
    body.textContent = content;

    wrapper.append(author, body);
    conversation.appendChild(wrapper);
    conversation.scrollTo({ top: conversation.scrollHeight, behavior: 'smooth' });
  }

  async function queryHuggingFace(prompt) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (HUGGINGFACE_API_TOKEN.trim()) {
      headers['Authorization'] = `Bearer ${HUGGINGFACE_API_TOKEN.trim()}`;
    }

    const response = await fetch(HUGGINGFACE_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        inputs: prompt,
        options: {
          wait_for_model: true
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (Array.isArray(data) && data[0]?.generated_text) {
      return data[0].generated_text;
    }

    if (typeof data?.generated_text === 'string') {
      return data.generated_text;
    }

    if (Array.isArray(data) && data[0]?.text) {
      return data[0].text;
    }

    throw new Error('No se recibió texto de respuesta del modelo.');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    input.disabled = true;
    sendButton.disabled = true;

    conversationState.messages.push({ role: 'user', content: message });
    appendMessage('user', message);

    try {
      const prompt = buildPrompt(conversationState.messages);
      const rawResponse = await queryHuggingFace(prompt);
      const assistantReply = extractLatestReply(rawResponse, message);

      conversationState.messages.push({ role: 'assistant', content: assistantReply });
      appendMessage('assistant', assistantReply);
    } catch (error) {
      const errorMessage = `Ocurrió un problema al contactar con Hugging Face. ${error.message}`;
      appendMessage('assistant', errorMessage);
    } finally {
      input.disabled = false;
      sendButton.disabled = false;
      input.focus();
    }
  }

  function buildPrompt(messages) {
    const intro = 'Eres un asistente útil que conversa en español cuando el usuario lo hace.';
    const formatted = messages
      .map((msg) => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`)
      .join('\n');
    return `${intro}\n${formatted}\nAsistente:`;
  }

  function extractLatestReply(generatedText, lastUserMessage) {
    const marker = `Usuario: ${lastUserMessage}`;
    const startIndex = generatedText.lastIndexOf(marker);
    if (startIndex === -1) {
      return generatedText.trim();
    }

    const afterUser = generatedText.slice(startIndex + marker.length);
    const assistantMarker = 'Asistente:';
    const assistantIndex = afterUser.indexOf(assistantMarker);

    if (assistantIndex === -1) {
      return generatedText.trim();
    }

    const assistantText = afterUser.slice(assistantIndex + assistantMarker.length);
    return assistantText.trim() || generatedText.trim();
  }

  form.addEventListener('submit', handleSubmit);
  input.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  input.focus();
});
