// ------- Tool links (edit as needed) -------
const toolLinks = {
  "Bhoot AI": null, // under dev
  "Ghost Crypt": "https://bhootservices-ghostcrypt.netlify.app",
  "File Engineer": "file-engineer/index.html",
  "Password Strength": "password-strength/index.html",
  "Fake ID Generator": "fake-id/index.html",
  "QR Code Generator": "qr-generator/index.html",
  "Base64 Tool": "base64-tool/index.html"
};

// DOM refs
const loader = document.getElementById('loader');
const audio = document.getElementById('launch-sound');
const typeText = document.getElementById('type-text');
const themeToggle = document.getElementById('theme-toggle');
const orderBtn = document.getElementById('order-btn');
const catButtons = document.querySelectorAll('.cat-btn');
const toolsGrid = document.getElementById('tools-grid');

// ---------- Theme (dark/light) ----------
function applyTheme(isLight){
  if(isLight) document.documentElement.classList.add('light');
  else document.documentElement.classList.remove('light');
  localStorage.setItem('bhoot_theme_light', isLight ? '1' : '0');
}
// init theme
const savedTheme = localStorage.getItem('bhoot_theme_light');
if(savedTheme === '1'){ themeToggle.checked = true; applyTheme(true);}
else applyTheme(false);
themeToggle.addEventListener('change', ()=> applyTheme(themeToggle.checked));

// ---------- Category filtering ----------
function setActiveCategory(catBtn){
  catButtons.forEach(b=>b.classList.remove('active'));
  catBtn.classList.add('active');
}
catButtons.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const cat = btn.getAttribute('data-cat');
    setActiveCategory(btn);
    filterTools(cat);
    // small UI nudge for mobile
    if(document.body.clientWidth <= 880){
      document.getElementById('sidebar').classList.remove('open');
    }
  })
});

function filterTools(category){
  const cards = toolsGrid.querySelectorAll('.tool-card');
  cards.forEach(card=>{
    const cat = card.getAttribute('data-category') || 'misc';
    if(category === 'all' || category === cat) card.style.display = '';
    else card.style.display = 'none';
  });
}

// ---------- Launch buttons & loader ----------
function showLoader(text){
  typeText.textContent = text || 'Initializing...';
  loader.classList.add('show');
}
function hideLoader(){ loader.classList.remove('show'); }

document.addEventListener('click', (e)=>{
  const target = e.target;
  if(target.classList.contains('launch-btn')){
    const card = target.closest('.tool-card');
    const toolName = card?.getAttribute('data-tool');
    const url = toolLinks[toolName];

    showLoader(`Booting ${toolName}...`);
    audio.currentTime = 0; audio.play().catch(()=>{});

    setTimeout(()=>{
      if(!url){
        hideLoader();
        if(['Bhoot AI','Ghost Crypt'].includes(toolName)) alert(`${toolName} isn't available yet. Contact developer.`);
        else alert('Tool link missing. Check configuration.');
        return;
      }
      // redirect (open in same tab)
      window.location.href = url;
    }, 1500);
  }
});

// ---------- Order button (mailto template) ----------
orderBtn.addEventListener('click', ()=>{
  const subject = encodeURIComponent('Tool Order');
  const body = encodeURIComponent('Name: [Your Name]\nTool Name: [Tool Name]\nEmail: [Your Email]\nDetails: [Describe requirements]');
  window.location.href = `mailto:aibhoot777@gmail.com?subject=${subject}&body=${body}`;
});

// ---------- Small helpers ----------
// Explore CTA scroll to tools
const exploreBtn = document.getElementById('explore-btn');
exploreBtn?.addEventListener('click', ()=>{
  document.getElementById('tools-section').scrollIntoView({behavior:'smooth'});
});

// Mobile sidebar toggle (tap brand to open)
const sidebar = document.getElementById('sidebar');
const brand = document.querySelector('.brand');
brand?.addEventListener('click', ()=>{
  if(document.body.clientWidth <= 880) sidebar.classList.toggle('open');
});

// init: show all
filterTools('all');