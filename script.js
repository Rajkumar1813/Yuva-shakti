/* ═══════════════════════════════════════════
   युवा शक्ति — Image Editor Script
   ═══════════════════════════════════════════ */

// ─── DISABLE DEVELOPER OPTIONS ───────────────
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', function (e) {
    // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S, Ctrl+A
    if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) ||
        (e.ctrlKey && ['u', 'U', 's', 'S', 'a', 'A'].includes(e.key))
    ) {
        e.preventDefault();
        return false;
    }
});



// ─── GLOBALS ─────────────────────────────────
let cropper = null;
let croppedBlob = null;  // Final cropped image blob
let rawImageSrc = null;  // Original uploaded image src


// ─── NOTIFICATION ─────────────────────────────
function showNotification(message, type) {
    const el = document.getElementById('notification');
    el.textContent = message;
    el.className = `notification ${type}`;
    el.style.display = 'block';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.style.display = 'none'; }, 3500);
}


// ─── UPLOAD → OPEN CROPPER ───────────────────
document.getElementById('imageUpload').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (ev) {
        rawImageSrc = ev.target.result;
        openCropper(rawImageSrc);
    };
    reader.readAsDataURL(file);
});

// Re-crop button
document.getElementById('recropBtn').addEventListener('click', function () {
    if (rawImageSrc) openCropper(rawImageSrc);
});


// ─── CROPPER MODAL ────────────────────────────
function openCropper(src) {
    const modal = document.getElementById('cropModal');
    const cropImg = document.getElementById('cropImage');

    modal.classList.add('active');
    cropImg.src = src;

    // Destroy previous cropper instance
    if (cropper) { cropper.destroy(); cropper = null; }

    cropImg.onload = function () {
        cropper = new Cropper(cropImg, {
            aspectRatio: 1,          // Square (circle crop will be done on canvas)
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.8,
            responsive: true,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
        });
    };
}

document.getElementById('cropCancel').addEventListener('click', closeCropModal);

document.getElementById('cropDone').addEventListener('click', function () {
    if (!cropper) return;

    // Get cropped canvas (square)
    const croppedCanvas = cropper.getCroppedCanvas({ width: 400, height: 400 });

    croppedCanvas.toBlob(function (blob) {
        croppedBlob = blob;

        // Show thumbnail
        const url = URL.createObjectURL(blob);
        document.getElementById('croppedPreviewImg').src = url;
        document.getElementById('croppedThumb').style.display = 'block';

        // Update upload zone
        const zone = document.getElementById('uploadZone');
        zone.classList.add('has-file');
        document.getElementById('uploadText').textContent = '✅ फोटो upload हो गई';
        zone.querySelector('i').className = 'fas fa-check-circle';

        // Enable process button
        document.getElementById('processBtn').disabled = false;

        closeCropModal();
        showNotification('फोटो crop हो गई! अब पोस्टर बनाओ। 🎉', 'success');
    }, 'image/png');
});

function closeCropModal() {
    document.getElementById('cropModal').classList.remove('active');
    if (cropper) { cropper.destroy(); cropper = null; }
}


// ─── PROCESS BUTTON ───────────────────────────
document.getElementById('processBtn').addEventListener('click', function () {
    if (!croppedBlob) {
        showNotification('पहले अपनी फोटो upload करो!', 'error');
        return;
    }

    showLoader(true);

    const canvas = document.getElementById('output');
    const ctx = canvas.getContext('2d');
    const userName = document.getElementById('userName').value.trim() || 'युवा शक्ति';

    // Load background
    const backgroundImg = new Image();
    backgroundImg.src = 'https://ik.imagekit.io/ohiabhist/yuva.png?updatedAt=1741420104589';
    backgroundImg.crossOrigin = 'Anonymous';

    backgroundImg.onload = function () {
        // Remove background via remove.bg
        removeBackground(croppedBlob)
            .then(bgRemovedBlob => {
                const url = URL.createObjectURL(bgRemovedBlob);
                const imgNoBg = new Image();
                imgNoBg.crossOrigin = 'Anonymous';
                imgNoBg.src = url;

                imgNoBg.onload = function () {
                    // Canvas = background size
                    canvas.width = backgroundImg.width;
                    canvas.height = backgroundImg.height;

                    // Draw background
                    ctx.drawImage(backgroundImg, 0, 0);

                    // Circle size & position
                    const circleSize = 265;
                    const x = canvas.width - circleSize - 50;
                    const y = 50;

                    // Draw circular user image
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(x + circleSize / 2, y + circleSize / 2, circleSize / 2, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(imgNoBg, x, y, circleSize, circleSize);
                    ctx.restore();

                    // Draw name text with shadow
                    ctx.save();
                    ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
                    ctx.fillStyle = '#e00000';
                    ctx.textAlign = 'center';
                    ctx.shadowColor = 'rgba(0,0,0,0.3)';
                    ctx.shadowBlur = 4;
                    ctx.fillText(userName, x + circleSize / 2, y + circleSize + 36);
                    ctx.restore();

                    // Show final image
                    const dataUrl = canvas.toDataURL('image/png');
                    const finalOutput = document.getElementById('finalOutput');
                    finalOutput.src = dataUrl;
                    finalOutput.style.display = 'block';
                    document.getElementById('outputHeading').style.display = 'block';

                    // Download link
                    const dl = document.getElementById('downloadLink');
                    dl.href = dataUrl;
                    dl.download = 'yuva-shakti-poster.png';
                    dl.style.display = 'block';

                    // Show preview jump button
                    document.getElementById('previewJumpBtn').style.display = 'block';

                    showLoader(false);
                    showNotification('🎉 पोस्टर तैयार है! Download करो।', 'success');

                    // Auto-scroll to preview after short delay
                    setTimeout(scrollToPreview, 500);
                };

                imgNoBg.onerror = function () {
                    showLoader(false);
                    showNotification('Image load नहीं हुई। दोबारा try करो।', 'error');
                };
            })
            .catch(err => {
                console.error(err);
                showLoader(false);
                showNotification('Background remove नहीं हुआ। दोबारा try करो।', 'error');
            });
    };

    backgroundImg.onerror = function () {
        showLoader(false);
        showNotification('Background image load नहीं हुई।', 'error');
    };
});


// ─── REMOVE BACKGROUND ────────────────────────
async function removeBackground(imageBlob) {
    const apiKey = 'hiNp8mxmp7HDZVo7vKdBAan5';
    const formData = new FormData();
    formData.append('image_file', imageBlob, 'photo.png');
    formData.append('size', 'auto');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: { 'X-Api-Key': apiKey },
        body: formData,
    });

    if (!response.ok) throw new Error('Background removal failed: ' + response.status);
    return await response.blob();
}


// ─── SCROLL TO PREVIEW ────────────────────────
function scrollToPreview() {
    const outputSection = document.getElementById('outputSection');
    if (outputSection) {
        outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}


// ─── LOADER ──────────────────────────────────
function showLoader(show) {
    const loader = document.getElementById('loader');
    if (show) loader.classList.add('active');
    else loader.classList.remove('active');
}


// ─── SCROLL TO TOP ────────────────────────────
const scrollBtn = document.getElementById('scrollToTop');
window.addEventListener('scroll', () => {
    scrollBtn.style.display = window.pageYOffset > 300 ? 'block' : 'none';
});
scrollBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});
