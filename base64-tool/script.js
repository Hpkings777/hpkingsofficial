// --- DOM Element Caching ---
const elements = {
  // Main UI
  tabs: document.querySelector('.tabs'),
  panels: document.querySelectorAll('.panel'),
  textInput: document.getElementById('textInput'),
  textOutput: document.getElementById('textOutput'),
  fileInput: document.getElementById('fileInput'),
  imgPreview: document.getElementById('imgPreview'),
  imageOutput: document.getElementById('imageOutput'),

  // Modal
  imageModalOverlay: document.getElementById('imageModalOverlay'),
  modalCanvas: document.getElementById('modalCanvas'),
  modalCompressionRange: document.getElementById('modalCompressionRange'),
  modalCompressionValue: document.getElementById('modalCompressionValue'),
  imageQualityPreset: document.getElementById('imageQualityPreset'),
  notificationContainer: document.getElementById('notification-container'),
  modalPreviewArea: document.querySelector('.modal-preview-area'), // New: for cropping
  cropSelectionBox: document.getElementById('cropSelectionBox'), // New: for cropping
  resetCropBtn: document.getElementById('resetCropBtn'), // New: for resetting crop
};

// --- Global State Variables ---
let originalImage = new Image();
let modalCtx = elements.modalCanvas.getContext('2d');
let currentEncodedImage = ''; // Stores the final encoded Base64 for copying
const IMAGE_RESOLUTION_PRESETS = {
    '120': 120, '240': 240, '360': 360, '480': 480,
    '720': 720, '1080': 1080, '1440': 1440, '2160': 2160,
    'original': null // Special case for original size
};

// --- Cropping State Variables ---
let isCropping = false;
let cropStartX, cropStartY; // Mouse coordinates relative to canvas
let cropBoxData = { x: 0, y: 0, width: 0, height: 0 }; // Stores the selected crop area

// --- Notification System State ---
const notificationQueue = [];
let isShowingNotification = false;

// --- Utility Functions ---

/** Displays a custom notification message. */
function showNotification(message, type = 'info', duration = 3000) {
    const notificationElement = document.createElement('div');
    notificationElement.className = `notification ${type}`; // Add type directly
    notificationElement.innerHTML = `
        <span class="notification-icon">${getNotificationIcon(type)}</span>
        <span class="notification-message">${message}</span>
    `;
    elements.notificationContainer.appendChild(notificationElement);
    notificationQueue.push(notificationElement); // Add element directly to queue
    processNotificationQueue(duration);
}

/** Returns a Unicode icon based on notification type. */
const getNotificationIcon = (type) => ({
  success: '✔️', error: '❌', info: 'ℹ️'
})[type] || ''; // Fallback for unknown types

/** Processes the notification queue. */
function processNotificationQueue(duration) {
    if (isShowingNotification || notificationQueue.length === 0) {
        return; // Already showing or nothing to show
    }

    isShowingNotification = true;
    const currentNotificationElement = notificationQueue.shift(); // Get the next notification from the queue

    // Apply 'active' class after a brief delay for transition
    setTimeout(() => {
        currentNotificationElement.classList.add('active');
    }, 50); // Small delay to ensure CSS transition gets applied correctly

    // Set timeout to hide the notification
    setTimeout(() => {
        currentNotificationElement.classList.remove('active');
        currentNotificationElement.classList.add('removing'); // Start the 'hide' animation

        // Remove element after transition completes
        currentNotificationElement.addEventListener('transitionend', function handler() {
            // Ensure it's the 'removing' transition ending before removal
            if (currentNotificationElement.classList.contains('removing')) {
                currentNotificationElement.remove();
                currentNotificationElement.removeEventListener('transitionend', handler); // Clean up listener
                isShowingNotification = false; // Allow next notification to show
                processNotificationQueue(duration); // Process next in queue
            }
        });
    }, duration);
}

/** Updates the value display for range sliders. */
function updateRangeValueDisplay(rangeElement, valueSpanElement, isPercentage = false) {
    valueSpanElement.textContent = isPercentage ?
        `${Math.round(parseFloat(rangeElement.value) * 100)}%` :
        `${rangeElement.value}px`;
}

/** Scales image dimensions while maintaining aspect ratio, based on a max dimension. */
function getScaledDimensions(originalWidth, originalHeight, maxDimension) {
    if (!maxDimension || (originalWidth <= maxDimension && originalHeight <= maxDimension)) {
        return { width: originalWidth, height: originalHeight };
    }

    let ratio;
    if (originalWidth > originalHeight) {
        ratio = maxDimension / originalWidth;
    } else {
        ratio = maxDimension / originalHeight;
    }
    return {
        width: Math.round(originalWidth * ratio),
        height: Math.round(originalHeight * ratio)
    };
}

/** Clears image-related UI elements. */
function clearImageUI() {
    elements.imgPreview.style.display = 'none';
    elements.imgPreview.src = '';
    elements.imageOutput.value = '';
    elements.fileInput.value = '';
    currentEncodedImage = ''; // Clear stored Base64
    if (modalCtx) modalCtx.clearRect(0, 0, elements.modalCanvas.width, elements.modalCanvas.height);
    resetCrop(); // Reset crop area as well
}

/** Gets mouse coordinates relative to the canvas. */
function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

// --- Cropping Functions ---

function resetCrop() {
    cropBoxData = { x: 0, y: 0, width: 0, height: 0 };
    elements.cropSelectionBox.style.display = 'none';
    elements.cropSelectionBox.style.width = '0px';
    elements.cropSelectionBox.style.height = '0px';
    elements.cropSelectionBox.style.left = '0px';
    elements.cropSelectionBox.style.top = '0px';
}

function startCrop(e) {
    isCropping = true;
    const pos = getMousePos(elements.modalCanvas, e);
    cropStartX = pos.x;
    cropStartY = pos.y;
    // Initialize crop box to a point
    cropBoxData = { x: cropStartX, y: cropStartY, width: 0, height: 0 };
    elements.cropSelectionBox.style.display = 'block';
    updateCropBoxUI();
}

function duringCrop(e) {
    if (!isCropping) return;
    const pos = getMousePos(elements.modalCanvas, e);
    let currentX = Math.min(Math.max(0, pos.x), elements.modalCanvas.width);
    let currentY = Math.min(Math.max(0, pos.y), elements.modalCanvas.height);

    cropBoxData.x = Math.min(cropStartX, currentX);
    cropBoxData.y = Math.min(cropStartY, currentY);
    cropBoxData.width = Math.abs(currentX - cropStartX);
    cropBoxData.height = Math.abs(currentY - cropStartY);

    updateCropBoxUI();
}

function endCrop() {
    isCropping = false;
    // Ensure crop box has valid dimensions, if not, hide it
    if (cropBoxData.width < 5 || cropBoxData.height < 5) { // Minimum 5x5 pixels
        resetCrop();
    }
}

function updateCropBoxUI() {
    elements.cropSelectionBox.style.left = `${cropBoxData.x}px`;
    elements.cropSelectionBox.style.top = `${cropBoxData.y}px`;
    elements.cropSelectionBox.style.width = `${cropBoxData.width}px`;
    elements.cropSelectionBox.style.height = `${cropBoxData.height}px`;
}

// --- Core Logic Functions ---

/** Switches between text and image tabs. */
function switchTab(event) {
  const tabName = event.target.dataset.tab;
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  elements.panels.forEach(panel => panel.classList.remove('active'));

  event.target.classList.add('active');
  document.getElementById(tabName).classList.add('active');

  if (tabName !== 'image') {
    clearImageUI();
    closeImageModal();
  }
}

/** Encodes text input to Base64. */
function encodeText() {
  const input = elements.textInput.value.trim();
  if (!input) {
    showNotification('Please enter text to encode.', 'info');
    return;
  }
  try {
    const encoded = btoa(input);
    elements.textOutput.value = encoded;
    showNotification('Text encoded successfully!', 'success');
  } catch (e) {
    elements.textOutput.value = '';
    showNotification('Error encoding text: Input contains characters outside of the Latin1 range.', 'error');
    console.error("Text encoding error:", e);
  }
}

/** Decodes Base64 text input. */
function decodeText() {
  const input = elements.textInput.value.trim();
  if (!input) {
    showNotification('Please enter Base64 text to decode.', 'info');
    return;
  }
  try {
    const decoded = atob(input);
    elements.textOutput.value = decoded;
    showNotification('Text decoded successfully!', 'success');
  } catch (e) {
    elements.textOutput.value = '';
    showNotification('Invalid Base64 string for text decoding!', 'error');
    console.error("Text decoding error:", e);
  }
}

/** Handles file input change for image processing. */
function handleFileInputChange() {
    const file = this.files[0];
    if (!file) {
        closeImageModal(); // If user cancels file selection
        return;
    }
    if (!file.type.startsWith('image/')) {
        showNotification('Please select a valid image file (e.g., JPEG, PNG, GIF).', 'error');
        this.value = ''; // Clear the file input
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => { // Use async here
        originalImage.onload = () => {
            openImageModal();
            // Reset to default preset on new image load
            elements.imageQualityPreset.value = '720'; // Default to 720p
            elements.modalCompressionRange.value = 0.8;   // Default compression
            updateRangeValueDisplay(elements.modalCompressionRange, elements.modalCompressionValue, true);
            resetCrop(); // Ensure crop is reset for new image
            drawPreviewImage(); // Draw preview without specific maxDimension initially
        };
        originalImage.onerror = () => {
            showNotification('Could not load image. It might be corrupted or an unsupported format.', 'error');
            closeImageModal();
            elements.fileInput.value = '';
        };
        originalImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

/** Opens the image settings modal. */
function openImageModal() {
    elements.imageModalOverlay.classList.add('show');
}

/** Closes the image settings modal. */
function closeImageModal() {
    elements.imageModalOverlay.classList.remove('show');
    // Clear original image source and file input to reset state
    originalImage.src = '';
    elements.fileInput.value = '';
    modalCtx.clearRect(0, 0, elements.modalCanvas.width, elements.modalCanvas.height); // Clear canvas
    resetCrop(); // Ensure crop is reset when modal closes
}

/** Applies the selected quality preset to the image sizing and calls for preview redraw. */
function applyQualityPreset() {
    drawPreviewImage();
}

/** Draws the image preview on the modal canvas, applying scaling based on chosen resolution. */
function drawPreviewImage() {
    if (!originalImage.src || !elements.modalCanvas || !modalCtx) {
        return;
    }

    const currentSelectedPreset = elements.imageQualityPreset.value;
    let targetDimension = IMAGE_RESOLUTION_PRESETS[currentSelectedPreset];

    if (targetDimension === null) { // 'original' selected
        targetDimension = Math.max(originalImage.width, originalImage.height); // Use the larger dimension
    }

    // Calculate dimensions for encoding (can be larger than modal preview)
    let { width, height } = getScaledDimensions(originalImage.width, originalImage.height, targetDimension);

    // Ensure modal preview itself doesn't exceed its visual bounds, independent of encoding size
    const MAX_MODAL_DISPLAY_WIDTH = 450; // Max width for the canvas display area
    const MAX_MODAL_DISPLAY_HEIGHT = 400; // Max height for the canvas display area

    let displayWidth = width;
    let displayHeight = height;

    // Scale down if image is too large for the modal preview area
    ({ width: displayWidth, height: displayHeight } = getScaledDimensions(width, height, Math.max(MAX_MODAL_DISPLAY_WIDTH, MAX_MODAL_DISPLAY_HEIGHT)));

    // Set canvas dimensions to display dimensions
    elements.modalCanvas.width = displayWidth;
    elements.modalCanvas.height = displayHeight;

    // Clear canvas and draw image
    modalCtx.clearRect(0, 0, elements.modalCanvas.width, elements.modalCanvas.height);
    modalCtx.drawImage(originalImage, 0, 0, displayWidth, displayHeight);

    // Keep crop box updated if it's active
    if (cropBoxData.width > 0 && cropBoxData.height > 0) {
        updateCropBoxUI();
    }
}

/** Applies image settings (resolution, compression, and cropping) and encodes the image. */
function applyImageSettings() {
    if (!originalImage.src) {
        showNotification('No image selected for processing.', 'error');
        closeImageModal();
        return;
    }

    const selectedPreset = elements.imageQualityPreset.value;
    let targetDimensionFinal = IMAGE_RESOLUTION_PRESETS[selectedPreset];

    if (targetDimensionFinal === null) { // 'original' selected
        targetDimensionFinal = Math.max(originalImage.width, originalImage.height);
    }

    const compressionQualityFinal = parseFloat(elements.modalCompressionRange.value);

    // Calculate the final scaled dimensions (before considering crop)
    let { width: scaledImgWidth, height: scaledImgHeight } = getScaledDimensions(originalImage.width, originalImage.height, targetDimensionFinal);

    // Create a temporary canvas for the final encoding
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    // Calculate scaling factor from original image to modal preview display
    const scaleFactorToModal = originalImage.width / elements.modalCanvas.width;

    let sourceX = 0, sourceY = 0, sourceWidth = originalImage.width, sourceHeight = originalImage.height;
    let destX = 0, destY = 0, destWidth = scaledImgWidth, destHeight = scaledImgHeight;

    // If a crop area is defined, adjust source and destination for drawing
    if (cropBoxData.width > 0 && cropBoxData.height > 0) {
        // Convert crop box coordinates from modal canvas display size to original image size
        sourceX = Math.round(cropBoxData.x * scaleFactorToModal);
        sourceY = Math.round(cropBoxData.y * scaleFactorToModal);
        sourceWidth = Math.round(cropBoxData.width * scaleFactorToModal);
        sourceHeight = Math.round(cropBoxData.height * scaleFactorToModal);

        // Adjust destination canvas dimensions to match cropped area's scaled size
        // The aspect ratio of the cropped area is maintained.
        destWidth = Math.round(sourceWidth * (scaledImgWidth / originalImage.width));
        destHeight = Math.round(sourceHeight * (scaledImgHeight / originalImage.height));

        tempCanvas.width = destWidth;
        tempCanvas.height = destHeight;

        // Draw the cropped portion from original image to the temporary canvas
        tempCtx.drawImage(
            originalImage,
            sourceX, sourceY, sourceWidth, sourceHeight, // Source image region
            destX, destY, destWidth, destHeight          // Destination on temp canvas
        );
    } else {
        // No crop, just scale and draw the entire image
        tempCanvas.width = scaledImgWidth;
        tempCanvas.height = scaledImgHeight;
        tempCtx.drawImage(originalImage, 0, 0, scaledImgWidth, scaledImgHeight);
    }

    currentEncodedImage = tempCanvas.toDataURL('image/jpeg', compressionQualityFinal);
    elements.imageOutput.value = currentEncodedImage;
    elements.imgPreview.src = currentEncodedImage;
    elements.imgPreview.style.display = 'block';

    closeImageModal();
    showNotification('Image encoded successfully!', 'success');
}

/** Handles the "Encode (from current output)" button click for image tab. */
function encodeImageFromCurrentInput() {
    const outputString = elements.imageOutput.value;
    if (outputString && outputString.startsWith("data:image")) {
        showNotification('Image is already encoded. Use "Choose Image" to re-encode with new settings.', 'info');
    } else if (elements.fileInput.files.length > 0) {
        showNotification('Please use "Apply & Encode" in the Image Settings dialog to process the chosen image.', 'info');
    } else {
        showNotification('No image selected or Base64 string to encode. Choose an image first.', 'info');
    }
}

/** Decodes a Base64 image string and displays it in the preview. */
function decodeImageString() {
  const base64String = elements.imageOutput.value.trim();
  if (!base64String) {
    showNotification('Please paste a Base64 image string into the text area to decode.', 'info');
    clearImageUI(); // Clear preview if input is empty
    return;
  }

  if (!base64String.startsWith("data:image/") || base64String.indexOf(';base64,') === -1) {
    showNotification("Invalid Base64 image string. It should start with 'data:image/...' and contain ';base64,'.", 'error');
    clearImageUI();
    return;
  }

  const img = new Image();
  img.onload = function() {
    elements.imgPreview.src = base64String;
    elements.imgPreview.style.display = 'block';
    showNotification('Image decoded and displayed in preview.', 'success');
  };
  img.onerror = function() {
    showNotification('Failed to decode Base64 string to image. It might be corrupted or malformed. Ensure the data part is correct.', 'error');
    clearImageUI();
  };
  img.src = base64String;
}

/** Pastes content from clipboard into image output and attempts to display as image. */
function pasteImage() {
  navigator.clipboard.readText().then(text => {
    text = text.trim();
    if (!text) {
      showNotification('Clipboard is empty or contains only whitespace.', 'info');
      return;
    }

    elements.imageOutput.value = text;
    currentEncodedImage = text;

    if (text.startsWith("data:image/") && text.indexOf(';base64,') !== -1) {
      const img = new Image();
      img.onload = function() {
          elements.imgPreview.src = text;
          elements.imgPreview.style.display = 'block';
          showNotification('Pasted Base64 image displayed in preview.', 'success');
      };
      img.onerror = function() {
          showNotification('Pasted content looks like Base64 but failed to load as an image (corrupted?).', 'error');
          clearImageUI();
      };
      img.src = text;
    } else {
      showNotification("Pasted content is not a valid image Base64 string.", 'error');
      clearImageUI();
    }
  }).catch(err => {
    showNotification("Clipboard access denied. Please grant permission to read clipboard.", 'error');
    console.error("Clipboard paste error:", err);
  });
}

/** Copies text from a specified textarea to the clipboard. */
function copyText(event) {
  const targetId = event.target.dataset.target;
  const textArea = document.getElementById(targetId);
  const textToCopy = (targetId === 'imageOutput' && currentEncodedImage) ? currentEncodedImage : textArea.value;

  if (!textToCopy.trim()) {
    showNotification('Nothing to copy!', 'info');
    return;
  }

  navigator.clipboard.writeText(textToCopy)
    .then(() => {
      showNotification('Copied to clipboard!', 'success');
    })
    .catch(err => {
      // Fallback for older browsers or if permission is denied
      textArea.select();
      document.execCommand("copy");
      showNotification('Copied to clipboard (fallback)!', 'info');
      console.warn("Clipboard writeText failed, used fallback:", err);
    });
}

// --- Event Listeners (Centralized) ---
document.addEventListener('DOMContentLoaded', () => {
  // Initial setup for modal range display
  updateRangeValueDisplay(elements.modalCompressionRange, elements.modalCompressionValue, true);
  // No explicit applyQualityPreset() here, as drawPreviewImage is called on image load/modal open

  // Tab switching (delegated to parent .tabs element)
  elements.tabs.addEventListener('click', (event) => {
    if (event.target.classList.contains('tab')) {
      switchTab(event);
    }
  });

  // Text panel buttons
  document.getElementById('encodeTextBtn').addEventListener('click', encodeText);
  document.getElementById('decodeTextBtn').addEventListener('click', decodeText);

  // Image panel buttons and file input
  elements.fileInput.addEventListener('change', handleFileInputChange);
  document.getElementById('encodeImageBtn').addEventListener('click', encodeImageFromCurrentInput);
  document.getElementById('decodeImageBtn').addEventListener('click', decodeImageString);
  document.getElementById('pasteImageBtn').addEventListener('click', pasteImage);

  // Delegated copy buttons for both textareas (using data-target attribute)
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', copyText);
  });

  // Modal controls
  elements.imageQualityPreset.addEventListener('change', drawPreviewImage); // Just redraw preview, settings apply on 'Apply'
  elements.modalCompressionRange.addEventListener('input', () => {
    updateRangeValueDisplay(elements.modalCompressionRange, elements.modalCompressionValue, true);
    // No need to redraw image on compression change as it only affects encoding quality, not display.
  });
  document.getElementById('applyImageSettingsBtn').addEventListener('click', applyImageSettings);
  document.getElementById('cancelImageModalBtn').addEventListener('click', closeImageModal);
  elements.resetCropBtn.addEventListener('click', resetCrop);

  // Cropping Event Listeners (on the modal preview area)
  elements.modalPreviewArea.addEventListener('mousedown', startCrop);
  elements.modalPreviewArea.addEventListener('mousemove', duringCrop);
  elements.modalPreviewArea.addEventListener('mouseup', endCrop);
  elements.modalPreviewArea.addEventListener('mouseleave', endCrop); // End crop if mouse leaves area
});
