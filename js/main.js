const cardWrapper = document.querySelector('.card-wrapper');
const categoryList = document.querySelector('.category-list');
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

// Function to dynamically generate category tabs
function renderCategoryTabs() {
  const categories = [...new Set(toolsData.map(tool => tool.category))];
  const allToolsTab = document.createElement('li');
  allToolsTab.textContent = 'All Tools';
  allToolsTab.classList.add('category-list-item', 'active');
  allToolsTab.dataset.category = 'All Tools';
  categoryList.appendChild(allToolsTab);

  categories.forEach(category => {
    const li = document.createElement('li');
    li.textContent = category;
    li.classList.add('category-list-item');
    li.dataset.category = category;
    categoryList.appendChild(li);
  });
}

// Function to handle the click event on a launch button
function handleLaunchClick(e) {
  const btn = e.target;
  const toolName = btn.parentElement.getAttribute('data-tool');
  const tool = toolsData.find(t => t.name === toolName);

  if (!tool) {
    alert("⚠️ An unknown error occurred. Tool data not found.");
    return;
  }

  // Show loader UI with dynamic text
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

// --- NEW FUNCTIONALITY ---
// Function to handle category filtering
function handleCategoryFilter(e) {
  const clickedTab = e.target.closest('.category-list-item');
  if (!clickedTab) return;

  // Update active state for tabs
  document.querySelectorAll('.category-list-item').forEach(tab => {
    tab.classList.remove('active');
  });
  clickedTab.classList.add('active');

  const category = clickedTab.dataset.category;
  let filteredTools = toolsData;

  if (category !== 'All Tools') {
    filteredTools = toolsData.filter(tool => tool.category === category);
  }

  renderToolCards(filteredTools);
}

// Initial setup
renderToolCards(toolsData);
renderCategoryTabs();

// Attach event listeners
cardWrapper.addEventListener('click', (e) => {
  if (e.target.classList.contains('launch-btn')) {
    handleLaunchClick(e);
  }
});

categoryList.addEventListener('click', handleCategoryFilter);
