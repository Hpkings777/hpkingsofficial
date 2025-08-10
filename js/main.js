const cardWrapper = document.querySelector('.card-wrapper');
const loader = document.getElementById("loader");
const audio = document.getElementById("launch-sound");
const typeText = document.getElementById("type-text");

// Function to render all tool cards from the toolsData array
function renderToolCards(data) {
  cardWrapper.innerHTML = ''; // Clear existing cards
  data.forEach(tool => {
    const badgesHtml = tool.badges ? tool.badges.map(badge => `<span class="badge">${badge}</span>`).join('') : '';
    const cardHtml = `
      <div class="tool-card" data-tool="${tool.name}">
        <div class="symbol">${tool.symbol}</div>
        <h2>${tool.name} ${badgesHtml}</h2>
        <p>${tool.description}</p>
        <button class="launch-btn">Launch 🚀</button>
      </div>
    `;
    cardWrapper.insertAdjacentHTML('beforeend', cardHtml);
  });
}

// Initial render of all tool cards
renderToolCards(toolsData);

// Function to handle the click event on a launch button
function handleLaunchClick(e) {
  const btn = e.target;
  const toolName = btn.parentElement.getAttribute('data-tool');
  const tool = toolsData.find(t => t.name === toolName);

  if (!tool) {
    alert("⚠️ An unknown error occurred. Tool data not found.");
    return;
  }

  // Show loader UI
  typeText.textContent = `Launching ${tool.name}...`;
  loader.classList.add("show");
  audio.currentTime = 0;
  audio.play();

  // Delay before action
  setTimeout(() => {
    loader.classList.remove("show");
    const url = tool.url;

    if (url) {
      // Redirect
      window.location.href = url;
    } else {
      // Handle unavailable tools
      alert(`❌ This tool isn't available yet. Please try contacting the developer.`);
    }
  }, 5000);
}

// Attach event listeners to all dynamically created launch buttons
// We use event delegation on the cardWrapper to handle clicks efficiently
cardWrapper.addEventListener('click', (e) => {
  if (e.target.classList.contains('launch-btn')) {
    handleLaunchClick(e);
  }
});
