const cardWrapper = document.querySelector('.card-wrapper');
const categoryList = document.querySelector('.category-list');
const sidebarToggleBtn = document.querySelector('.sidebar-toggle');
const sidebar = document.querySelector('.sidebar');
const loader = document.getElementById("loader");
const audio = document.getElementById("launch-sound");
const typeText = document.getElementById("type-text");

const orderFormBtn = document.getElementById('open-order-form');
const orderModal = document.getElementById('order-modal');
const closeBtn = orderModal.querySelector('.close-btn');
const orderForm = document.getElementById('order-form');
const mainContent = document.querySelector('.main-content');
const sidebarCloseBtn = document.querySelector('.sidebar-close-btn');

const BOT_TOKEN = '7511214595:AAFBqnI6fbx-7i5Htu_mB3_eBHrrEuVQpds';
const CHAT_ID = '6629569759';

function renderToolCards(data) {
  cardWrapper.innerHTML = '';
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

function handleLaunchClick(e) {
  const btn = e.target;
  const toolName = btn.parentElement.getAttribute('data-tool');
  const tool = toolsData.find(t => t.name === toolName);

  if (!tool) {
    alert("⚠️ An unknown error occurred. Tool data not found.");
    return;
  }

  typeText.textContent = `Launching ${tool.name}...`;
  loader.classList.add("show");
  audio.currentTime = 0;
  audio.play();

  setTimeout(() => {
    loader.classList.remove("show");
    const url = tool.url;

    if (url) {
      window.location.href = url;
    } else {
      alert(`❌ This tool isn't available yet. Please try contacting the developer.`);
    }
  }, 5000);
}

function handleCategoryFilter(e) {
  const clickedTab = e.target.closest('.category-list-item');
  if (!clickedTab) return;

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

function toggleSidebar() {
  sidebar.classList.toggle('show');
  mainContent.classList.toggle('sidebar-open');
}

async function handleOrderFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const toolName = document.getElementById('tool-name').value;
  const details = document.getElementById('details').value;

  const message = `
    **New Tool Order**
    Name: ${name}
    Email: ${email}
    Tool Name: ${toolName}
    Details: ${details || 'N/A'}
  `;

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const data = new FormData();
  data.append('chat_id', CHAT_ID);
  data.append('text', message);
  data.append('parse_mode', 'Markdown');

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: data
    });
    
    if (response.ok) {
      alert('✅ Your order has been sent successfully!');
      orderForm.reset();
      orderModal.classList.remove('show');
    } else {
      alert('❌ Failed to send order. Please try again.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('❌ An error occurred. Please check your internet connection.');
  }
}

renderToolCards(toolsData);
renderCategoryTabs();

cardWrapper.addEventListener('click', (e) => {
  if (e.target.classList.contains('launch-btn')) {
    handleLaunchClick(e);
  }
});

categoryList.addEventListener('click', handleCategoryFilter);
sidebarToggleBtn.addEventListener('click', toggleSidebar);

sidebarCloseBtn.addEventListener('click', toggleSidebar);

orderFormBtn.addEventListener('click', () => {
  orderModal.classList.add('show');
});

closeBtn.addEventListener('click', () => {
  orderModal.classList.remove('show');
});

orderForm.addEventListener('submit', handleOrderFormSubmit);
