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
  modalPreviewArea: document.querySelector('.modal-preview-area'),
  cropSelectionBox: document.getElementById('cropSelectionBox'),
  resetCropBtn: document.getElementById('resetCropBtn'),
};

// --- Global State Variables ---
let originalImage = new Image(); // This holds the image loaded into the modal for processing
let modalCtx = elements.modalCanvas.getContext('2d');
let currentEncodedImage = ''; // Stores the final encoded Base64 for copying
const IMAGE_RESOLUTION_PRESETS = {
    '120': 120, '240': 240, '360': 360, '480': 480,
    '720': 720, '1080': 1080, '1440': 1440, '2160': 2160,
    'original': null // Special case for original size
};
const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1MB in bytes

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
    notificationElement.className = `notification ${type}`;
    notificationElement.innerHTML = `
        <span class="notification-icon">${getNotificationIcon(type)}</span>
        <span class="notification-message">${message}</span>
    `;
    elements.notificationContainer.appendChild(notificationElement);
    notificationQueue.push(notificationElement);
    processNotificationQueue(duration);
}

/** Returns a Unicode icon based on notification type. */
const getNotificationIcon = (type) => ({
  success: '✔️', error: '❌', info: 'ℹ️'
})[type] || '';

/** Processes the notification queue. */
function processNotificationQueue(duration) {
    if (isShowingNotification || notificationQueue.length === 0) {
        return;
    }

    isShowingNotification = true;
    const currentNotificationElement = notificationQueue.shift();

    setTimeout(() => {
        currentNotificationElement.classList.add('active');
    }, 50);

    const removeNotificationHandler = function() {
        if (currentNotificationElement.classList.contains('removing')) {
            currentNotificationElement.remove();
            currentNotificationElement.removeEventListener('transitionend', removeNotificationHandler);
            isShowingNotification = false;
            processNotificationQueue(duration);
        }
    };

    currentNotificationElement.addEventListener('transitionend', removeNotificationHandler);

    setTimeout(() => {
        currentNotificationElement.classList.remove('active');
        currentNotificationElement.classList.add('removing');
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

/** Clears image-related UI elements and state. */
function clearImageUI() {
    elements.imgPreview.style.display = 'none';
    elements.imgPreview.src = '';
    // elements.imageOutput.value = ''; // DO NOT clear imageOutput here directly
    elements.fileInput.value = '';
    currentEncodedImage = '';

    if (originalImage) {
        originalImage.onload = null;
        originalImage.onerror = null;
        originalImage.src = '';
    }
    originalImage = new Image();

    if (modalCtx) modalCtx.clearRect(0, 0, elements.modalCanvas.width, elements.modalCanvas.height);
    resetCrop();
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
    if (e.button !== 0) return;
    isCropping = true;
    const pos = getMousePos(elements.modalCanvas, e);
    cropStartX = pos.x;
    cropStartY = pos.y;
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
    if (!isCropping) return;
    isCropping = false;
    if (cropBoxData.width < 5 || cropBoxData.height < 5) {
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
    elements.imageOutput.value = ''; // Clear image output explicitly when leaving tab
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
        closeImageModal();
        return;
    }
    if (!file.type.startsWith('image/')) {
        showNotification('Please select a valid image file (e.g., JPEG, PNG, GIF).', 'error');
        this.value = '';
        return;
    }

    clearImageUI(); // Ensure originalImage is a fresh object
    elements.imageOutput.value = ''; // Clear output on new file selection

    const reader = new FileReader();
    reader.onload = (e) => {
        originalImage.onload = () => {
            openImageModal();

            let compressionToSet = 0.8;
            let resolutionToSet = '720';

            const estimatedBase64Size = e.target.result.length * 0.75;

            if (file.size > MAX_FILE_SIZE_BYTES || estimatedBase64Size > MAX_FILE_SIZE_BYTES) {
                showNotification(
                    `Image size (${(file.size / (1024 * 1024)).toFixed(2)} MB) is greater than 1MB. ` +
                    `Automatically adjusting quality and resolution for better performance.`,
                    'info',
                    5000
                );
                resolutionToSet = '360';
                compressionToSet = 0.6;
            }

            elements.imageQualityPreset.value = resolutionToSet;
            elements.modalCompressionRange.value = compressionToSet;
            updateRangeValueDisplay(elements.modalCompressionRange, elements.modalCompressionValue, true);
            resetCrop();
            drawPreviewImage();
        };
        originalImage.onerror = (err) => {
            showNotification('Could not load image. It might be corrupted or an unsupported format.', 'error');
            console.error("Original Image Load Error:", err);
            closeImageModal();
            elements.fileInput.value = '';
        };
        originalImage.src = e.target.result;
    };
    reader.onerror = (err) => {
        showNotification('Error reading file. Please try again.', 'error');
        console.error("FileReader error:", err);
        elements.fileInput.value = '';
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
    // We don't call clearImageUI here directly if we want the output to remain visible.
    // Instead, clearImageUI is called in specific success/failure paths.
}

/** Draws the image preview on the modal canvas, applying scaling based on chosen resolution. */
function drawPreviewImage() {
    if (!originalImage || !originalImage.src || !elements.modalCanvas || !modalCtx) {
        console.warn("Attempted to draw preview without a valid image source.");
        return;
    }

    const currentSelectedPreset = elements.imageQualityPreset.value;
    let targetDimension = IMAGE_RESOLUTION_PRESETS[currentSelectedPreset];

    if (targetDimension === null) {
        targetDimension = Math.max(originalImage.width, originalImage.height);
    }

    let { width: naturalWidth, height: naturalHeight } = originalImage;
    if (naturalWidth === 0 || naturalHeight === 0) {
        setTimeout(drawPreviewImage, 100);
        return;
    }

    let { width, height } = getScaledDimensions(naturalWidth, naturalHeight, targetDimension);

    const MAX_MODAL_DISPLAY_WIDTH = 450;
    const MAX_MODAL_DISPLAY_HEIGHT = 400;

    let displayWidth = width;
    let displayHeight = height;

    ({ width: displayWidth, height: displayHeight } = getScaledDimensions(width, height, Math.max(MAX_MODAL_DISPLAY_WIDTH, MAX_MODAL_DISPLAY_HEIGHT)));

    elements.modalCanvas.width = displayWidth;
    elements.modalCanvas.height = displayHeight;

    modalCtx.clearRect(0, 0, elements.modalCanvas.width, elements.modalCanvas.height);
    modalCtx.drawImage(originalImage, 0, 0, displayWidth, displayHeight);

    if (cropBoxData.width > 0 && cropBoxData.height > 0) {
        updateCropBoxUI();
    }
}

/** Applies image settings (resolution, compression, and cropping) and encodes the image. */
function applyImageSettings() {
    if (!originalImage || !originalImage.src) {
        showNotification('No image selected for processing.', 'error');
        closeImageModal();
        return;
    }

    const selectedPreset = elements.imageQualityPreset.value;
    let targetDimensionFinal = IMAGE_RESOLUTION_PRESETS[selectedPreset];

    if (targetDimensionFinal === null) {
        targetDimensionFinal = Math.max(originalImage.width, originalImage.height);
    }

    const compressionQualityFinal = parseFloat(elements.modalCompressionRange.value);

    let { width: scaledImgWidth, height: scaledImgHeight } = getScaledDimensions(originalImage.width, originalImage.height, targetDimensionFinal);

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    const scaleFactorModalToOriginal = originalImage.width / elements.modalCanvas.width;

    let sourceX = 0, sourceY = 0, sourceWidth = originalImage.width, sourceHeight = originalImage.height;
    let destX = 0, destY = 0, destWidth = scaledImgWidth, destHeight = scaledImgHeight;

    if (cropBoxData.width > 0 && cropBoxData.height > 0) {
        sourceX = Math.round(cropBoxData.x * scaleFactorModalToOriginal);
        sourceY = Math.round(cropBoxData.y * scaleFactorModalToOriginal);
        sourceWidth = Math.round(cropBoxData.width * scaleFactorModalToOriginal);
        sourceHeight = Math.round(cropBoxData.height * scaleFactorModalToOriginal);

        const croppedAspectRatio = sourceWidth / sourceHeight;
        if (croppedAspectRatio > (scaledImgWidth / scaledImgHeight)) {
            destWidth = scaledImgWidth;
            destHeight = Math.round(scaledImgWidth / croppedAspectRatio);
        } else {
            destHeight = scaledImgHeight;
            destWidth = Math.round(scaledImgHeight * croppedAspectRatio);
        }

        tempCanvas.width = destWidth;
        tempCanvas.height = destHeight;

        tempCtx.drawImage(
            originalImage,
            sourceX, sourceY, sourceWidth, sourceHeight,
            0, 0, destWidth, destHeight
        );
    } else {
        tempCanvas.width = scaledImgWidth;
        tempCanvas.height = scaledImgHeight;
        tempCtx.drawImage(originalImage, 0, 0, scaledImgWidth, scaledImgHeight);
    }

    try {
        currentEncodedImage = tempCanvas.toDataURL('image/jpeg', compressionQualityFinal);
        elements.imageOutput.value = currentEncodedImage; // Set the value FIRST
        elements.imgPreview.src = currentEncodedImage;
        elements.imgPreview.style.display = 'block';

        const finalBase64Bytes = currentEncodedImage.length * 0.75;
        if (finalBase64Bytes > MAX_FILE_SIZE_BYTES) {
            showNotification(
                `Encoded image size (${(finalBase64Bytes / (1024 * 1024)).toFixed(2)} MB) is still large. ` +
                `Consider a lower resolution or compression for optimal performance.`,
                'info',
                5000
            );
        } else {
             showNotification('Image encoded successfully!', 'success');
        }

    } catch (e) {
        showNotification('Error encoding image. Corrupted data or unsupported format?', 'error');
        console.error("Image encoding failed:", e);
        elements.imageOutput.value = ''; // Clear output on failure
    } finally {
        // IMPORTANT: Perform cleanup *after* the output is set and notification shown.
        // We close the modal, then clear the originalImage state, BUT leave the output.
        closeImageModal(); // This only hides the modal, doesn't clear output
        clearImageUI(); // This clears originalImage, preview image, and fileInput state, but NOT imageOutput.value
    }
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
    clearImageUI();
    elements.imageOutput.value = ''; // Ensure it's clear if input was empty
    return;
  }

  if (!base64String.startsWith("data:image/") || base64String.indexOf(';base64,') === -1) {
    showNotification("Invalid Base64 image string. It should start with 'data:image/...' and contain ';base64,'.", 'error');
    clearImageUI();
    elements.imageOutput.value = ''; // Ensure it's clear on invalid input
    return;
  }

  const tempImg = new Image();
  tempImg.onload = function() {
    elements.imgPreview.src = base64String;
    elements.imgPreview.style.display = 'block';
    showNotification('Image decoded and displayed in preview.', 'success');
    // Clear originalImage state but *keep* the output and preview for the decoded string
    clearImageUI(); // This clears originalImage and fileInput etc.
    elements.imageOutput.value = base64String; // Re-set the output value after clearImageUI
    elements.imgPreview.src = base64String; // Re-set the preview src
    elements.imgPreview.style.display = 'block';
  };
  tempImg.onerror = function() {
    showNotification('Failed to decode Base64 string to image. It might be corrupted or malformed.', 'error');
    clearImageUI();
    elements.imageOutput.value = ''; // Clear output on decode failure
  };
  tempImg.src = base64String;
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
      const tempImg = new Image();
      tempImg.onload = function() {
          elements.imgPreview.src = text;
          elements.imgPreview.style.display = 'block';
          showNotification('Pasted Base64 image displayed in preview.', 'success');
          // Clear originalImage state but *keep* the output and preview for the pasted string
          clearImageUI();
          elements.imageOutput.value = text;
          elements.imgPreview.src = text;
          elements.imgPreview.style.display = 'block';
      };
      tempImg.onerror = function() {
          showNotification('Pasted content looks like Base64 but failed to load as an image (corrupted?).', 'error');
          clearImageUI();
          elements.imageOutput.value = ''; // Clear output on paste failure
      };
      tempImg.src = text;
    } else {
      showNotification("Pasted content is not a valid image Base64 string.", 'error');
      clearImageUI();
      elements.imageOutput.value = ''; // Clear output if paste isn't valid image Base64
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
      textArea.select();
      document.execCommand("copy");
      showNotification('Copied to clipboard (fallback)!', 'info');
      console.warn("Clipboard writeText failed, used fallback:", err);
    });
}

// --- Event Listeners (Centralized) ---
document.addEventListener('DOMContentLoaded', () => {
  updateRangeValueDisplay(elements.modalCompressionRange, elements.modalCompressionValue, true);

  elements.tabs.addEventListener('click', (event) => {
    if (event.target.classList.contains('tab')) {
      switchTab(event);
    }
  });

  document.getElementById('encodeTextBtn').addEventListener('click', encodeText);
  document.getElementById('decodeTextBtn').addEventListener('click', decodeText);

  elements.fileInput.addEventListener('change', handleFileInputChange);
  document.getElementById('encodeImageBtn').addEventListener('click', encodeImageFromCurrentInput);
  document.getElementById('decodeImageBtn').addEventListener('click', decodeImageString);
  document.getElementById('pasteImageBtn').addEventListener('click', pasteImage);

  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', copyText);
  });

  elements.imageQualityPreset.addEventListener('change', drawPreviewImage);
  elements.modalCompressionRange.addEventListener('input', () => {
    updateRangeValueDisplay(elements.modalCompressionRange, elements.modalCompressionValue, true);
  });
  document.getElementById('applyImageSettingsBtn').addEventListener('click', applyImageSettings);
  document.getElementById('cancelImageModalBtn').addEventListener('click', closeImageModal);
  elements.resetCropBtn.addEventListener('click', resetCrop);

  // Cropping Event Listeners
  elements.modalPreviewArea.addEventListener('mousedown', startCrop);
  elements.modalPreviewArea.addEventListener('mousemove', duringCrop);
  elements.modalPreviewArea.addEventListener('mouseup', endCrop);
  elements.modalPreviewArea.addEventListener('mouseleave', endCrop);
});
