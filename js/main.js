const toolLinks = {
  // 🔗 External tools
  "Bhoot AI": null, // or leave empty if under dev
  "Ghost Crypt": "https://bhootservices-ghostcrypt.netlify.app",

  // 📁 Internal tools
  "File Engineer": "file-engineer/index.html",
  "Password Strength": "password-strength/index.html",
  "Fake ID Generator": "fake-id/index.html",
  "QR Code Generator": "qr-generator/index.html",
  "Base64 Tool": "base64-tool/index.html"
};

document.querySelectorAll('.launch-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const toolName = btn.parentElement.getAttribute('data-tool');
    const url = toolLinks[toolName];

    const loader = document.getElementById("loader");
    const audio = document.getElementById("launch-sound");
    const typeText = document.getElementById("type-text");

    // Show loader UI
    typeText.textContent = "Initializing Tool Interface...";
    loader.classList.add("show");
    audio.currentTime = 0;
    audio.play();

    // Delay before action
    setTimeout(() => {
      if (!url) {
        loader.classList.remove("show");

        if (["Bhoot AI", "Ghost Crypt"].includes(toolName)) {
          alert("❌ This tool isn't available for you yet. Please try contacting the developer.");
        } else {
          alert("⚠️ Some unknown error occurred. Try checking your network connection.");
        }
        return;
      }

      // Redirect
      window.location.href = url;
    }, 8000);
  });
});
