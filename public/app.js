const form = document.getElementById('message-form');
const input = document.getElementById('message-input');
const chatBox = document.getElementById('chat-box');

function appendMessage(text, sender) {
  const div = document.createElement('div');
  div.className = 'message ' + sender;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const message = input.value.trim();
  if (!message) return;
  
  appendMessage(message, 'user');
  input.value = '';

  const response = await fetch('/api/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerId: 'Provider1', message })
  });
  const data = await response.json();
  appendMessage(data.reply, 'bot');
});
