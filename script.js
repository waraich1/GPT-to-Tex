// A user script that lets you download ChatGPT conversations as LaTeX files.

// Note:
// This code was mostly written by GPT-4.

// Usage:
// 1. Copy and paste this code into the console.
// 2. Click on conversations to download them as LaTeX files.

function parseChatGPTData(data) {
  const mapping = data.mapping;
  const conversationTitle = data.title;
  const createDate = new Date(data.create_time * 1000).toISOString().slice(0, 10);

  // Extract messages from the mapping object
  const messagesArray = Object.values(mapping)
    .filter(node => node.message)
    .map(node => {
      const message = node.message;
      const sender = message.author.role === 'user' ? 'You' : 'Assistant';
      const content = message.content.parts.join('');
      const createTime = message.create_time;

      return {
        sender: sender,
        content: content,
        createTime: createTime,
      };
    });

  // Sort messages by createTime
  messagesArray.sort((a, b) => a.createTime - b.createTime);

  return {
    date: createDate,
    title: conversationTitle,
    messages: messagesArray.map(({ sender, content }) => ({ sender, content })),
  };
}

// Function to download a text file
function download(filename, text) {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// Function to format conversation messages in LaTeX
function formatMessages(messages) {
  return messages
    .map((message, index) => {
      const separator = index !== messages.length - 1 ? '\\vspace{1em}\n\n' : '';
      const questionAnswerSpacing = message.sender === 'You' ? '\\vspace{0.5em}\n\n' : '';
      return `\\textbf{${message.sender}}: ${message.content}${questionAnswerSpacing}${separator}`;
    })
    .join('\n\n');
}

function saveGPT(data) {
  const conversation = parseChatGPTData(data);
  const filename = `${conversation.date}-${conversation.title}.tex`;
  const formattedMessages = formatMessages(conversation.messages);
  const latexContent = `\\documentclass{article}\n\\usepackage{hyperref}\n\\begin{document}\n\n${formattedMessages}\n\n\\end{document}`;
  download(filename, latexContent);
}

const originalFetch = window.fetch;

window.fetch = async function (input, init) {
  const response = await originalFetch(input, init);

  // Check if the URL contains '/conversation/' and the method is 'GET'
  if (
    typeof input === 'string' &&
    input.includes('/conversation/') &&
    (!init || (init && init.method === 'GET'))
  ) {
    // Clone the response to avoid interference with the original response
    const clonedResponse = response.clone();

    // Parse the JSON and call the saveGPT function
    clonedResponse.json().then(data => {
      saveGPT(data);
    });
  }

  return response;
};
