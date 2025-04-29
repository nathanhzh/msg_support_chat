const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const chatBox = document.getElementById('chat-box');

messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message) return;

    addMessage(message, 'user-message');
    messageInput.value = '';

    const loadingBubble = addMessage('...', 'bot-message');

    const response = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
    });

    const data = await response.json();

    loadingBubble.innerText = data.reply;
});

function addMessage(text, className) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${className}`;
    messageDiv.innerText = text;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return messageDiv;
}
