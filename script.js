/* ═══════════════════════════════════════════
   युवा शक्ति — Image Editor Script v3
   ═══════════════════════════════════════════ */

// ─── DISABLE DEVELOPER OPTIONS ───────────────
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', function (e) {
    if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I','J','C','i','j','c'].includes(e.key)) ||
        (e.ctrlKey && ['u','U','s','S','a','A'].includes(e.key))
    ) {
        e.preventDefault();
        return false;
    }
});

// ─── GLOBALS ─────────────────────────────────
let cropper      = null;
let croppedBlob  = null;
let rawImageSrc  = null;
let sessionTimer = null;   // setInterval reference
let sessionEndAt = null;   // timestamp when session expires
let hasData      = false;  // true once user has uploaded/processed something
let pendingLeave = false;  // for refresh confirm

// ─── REFRESH / BEFOREUNLOAD GUARD ────────────
window.addEventListener('beforeunload', function (e) {
    if (!hasData) return;
    // Show browser's native warning too
    e.preventDefault();
    e.returnValue = '';
    // Show our custom modal
    showConfirmModal(false);
    return '';
});

// Custom modal buttons
document.getElementById('btnStay').addEventListener('click', function () {
    hideConfirmModal();
});
document.getElementById('btnLeave').addEventListener('click', function () {
    hideConfirmModal();
    hasData = false; // allow reload
    clearSessionTimer();
    window.location.reload();
});

// Intercept actual page refresh (F5 / Ctrl+R)
document.addEventListener('keydown', function (e) {
    if (hasData && (e.key === 'F5' || (e.ctrlKey && e.key === 'r'))) {
        e.preventDefault();
        showConfirmModal(true);
    }
});

function showConfirmModal(isRefresh) {
    document.getElementById('confirmOverlay').classList.add('active');
}
function hideConfirmModal() {
    document.getElementById('confirmOverlay').classList.remove('active');
}

// ─── SESSION TIMER (10 minutes) ──────────────
const TIMER_DURATION = 10 * 60 * 1000; // 10 min in ms

function startSessionTimer() {
    clearSessionTimer();
    sessionEndAt = Date.now() + TIMER_DURATION;
    document.getElementById('timerBanner').style.display = 'block';

    sessionTimer = setInterval(() => {
        const remaining = sessionEndAt - Date.now();
        if (remaining <= 0) {
            clearSessionTimer();
            expireSession();
            return;
        }
        updateTimerDisplay(remaining);

        // Urgency color changes
        const banner = document.getElementById('timerBanner');
        if (remaining < 60000) {
            banner.style.background = 'linear-gradient(90deg, #ffe0e0, #ffb3b3)';
            banner.style.borderColor = '#dc3545';
            banner.style.color = '#7a0000';
            document.getElementById('timerStatus').textContent = '⚠️ जल्दी करो!';
        } else if (remaining < 3 * 60000) {
            banner.style.background = 'linear-gradient(90deg, #fff0d0, #ffe5a0)';
            document.getElementById('timerStatus').textContent = 'जल्दी download कर लो!';
        }
    }, 1000);

    updateTimerDisplay(TIMER_DURATION);
}

function updateTimerDisplay(ms) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    document.getElementById('timerDisplay').textContent =
        String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}

function clearSessionTimer() {
    if (sessionTimer) { clearInterval(sessionTimer); sessionTimer = null; }
}

function expireSession() {
    hasData = false;
    showNotification('⏰ 10 मिनट हो गए! Data हटाया जा रहा है...', 'error');
    setTimeout(() => {
        resetAll();
        document.getElementById('timerBanner').style.display = 'none';
    }, 2000);
}

// ─── RESET ALL (New Poster) ───────────────────
function resetAll() {
    // Reset globals
    croppedBlob = null;
    rawImageSrc = null;

    // Reset upload zone
    const zone = document.getElementById('uploadZone');
    zone.classList.remove('has-file');
    document.getElementById('uploadText').textContent = 'यहाँ क्लिक करो या फोटो drag करो';
    zone.querySelector('i').className = 'fas fa-cloud-upload-alt';
    document.getElementById('imageUpload').value = '';

    // Reset cropped thumb
    document.getElementById('croppedThumb').style.display = 'none';
    document.getElementById('croppedPreviewImg').src = '#';

    // Reset name
    document.getElementById('userName').value = '';

    // Reset buttons/output
    document.getElementById('processBtn').disabled = true;
    document.getElementById('previewJumpBtn').style.display = 'none';
    document.getElementById('downloadLink').style.display = 'none';
    document.getElementById('newPosterBtn').style.display = 'none';
    document.getElementById('finalOutput').style.display = 'none';
    document.getElementById('finalOutput').src = '#';
    document.getElementById('outputHeading').style.display = 'none';

    // Reset timer banner style
    const banner = document.getElementById('timerBanner');
    banner.style.background = '';
    banner.style.borderColor = '';
    banner.style.color = '';
    document.getElementById('timerStatus').textContent = 'जल्दी download कर लो!';

    hasData = false;
    clearSessionTimer();
    document.getElementById('timerBanner').style.display = 'none';

    window.scrollTo({ top: 0, behavior: 'smooth' });
    showNotification('नया पोस्टर बनाओ! 🎨', 'info');
}

document.getElementById('newPosterBtn').addEventListener('click', resetAll);

// ─── NOTIFICATION ─────────────────────────────
function showNotification(message, type) {
    const el = document.getElementById('notification');
    el.textContent = message;
    el.className = `notification ${type}`;
    el.style.display = 'block';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.style.display = 'none'; }, 3800);
}

// ─── UPLOAD → OPEN CROPPER ───────────────────
document.getElementById('imageUpload').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    hasData = true;
    const reader = new FileReader();
    reader.onload = function (ev) {
        rawImageSrc = ev.target.result;
        openCropper(rawImageSrc);
    };
    reader.readAsDataURL(file);
});

document.getElementById('recropBtn').addEventListener('click', function () {
    if (rawImageSrc) openCropper(rawImageSrc);
});

// ─── CROPPER MODAL ────────────────────────────
function openCropper(src) {
    const modal  = document.getElementById('cropModal');
    const cropImg = document.getElementById('cropImage');
    modal.classList.add('active');
    cropImg.src = src;
    if (cropper) { cropper.destroy(); cropper = null; }
    cropImg.onload = function () {
        cropper = new Cropper(cropImg, {
            aspectRatio: 1,
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
    const croppedCanvas = cropper.getCroppedCanvas({ width: 400, height: 400 });
    croppedCanvas.toBlob(function (blob) {
        croppedBlob = blob;
        const url = URL.createObjectURL(blob);
        document.getElementById('croppedPreviewImg').src = url;
        document.getElementById('croppedThumb').style.display = 'block';

        const zone = document.getElementById('uploadZone');
        zone.classList.add('has-file');
        document.getElementById('uploadText').textContent = '✅ फोटो upload हो गई';
        zone.querySelector('i').className = 'fas fa-check-circle';

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

    const canvas   = document.getElementById('output');
    const ctx      = canvas.getContext('2d');
    const userName = document.getElementById('userName').value.trim() || 'युवा शक्ति';

    const backgroundImg = new Image();
    backgroundImg.src = 'https://ik.imagekit.io/ohiabhist/yuva.png?updatedAt=1741420104589';
    backgroundImg.crossOrigin = 'Anonymous';

    backgroundImg.onload = function () {
        removeBackground(croppedBlob)
            .then(bgBlob => {
                const url = URL.createObjectURL(bgBlob);
                const imgNoBg = new Image();
                imgNoBg.crossOrigin = 'Anonymous';
                imgNoBg.src = url;

                imgNoBg.onload = function () {
                    canvas.width  = backgroundImg.width;
                    canvas.height = backgroundImg.height;
                    ctx.drawImage(backgroundImg, 0, 0);

                    const circleSize = 265;
                    const x = canvas.width - circleSize - 50;
                    const y = 50;

                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(x + circleSize/2, y + circleSize/2, circleSize/2, 0, Math.PI*2);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(imgNoBg, x, y, circleSize, circleSize);
                    ctx.restore();

                    ctx.save();
                    ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
                    ctx.fillStyle = '#e00000';
                    ctx.textAlign = 'center';
                    ctx.shadowColor = 'rgba(0,0,0,0.3)';
                    ctx.shadowBlur = 4;
                    ctx.fillText(userName, x + circleSize/2, y + circleSize + 36);
                    ctx.restore();

                    const dataUrl = canvas.toDataURL('image/png');
                    const finalOutput = document.getElementById('finalOutput');
                    finalOutput.src = dataUrl;
                    finalOutput.style.display = 'block';
                    document.getElementById('outputHeading').style.display = 'block';

                    const dl = document.getElementById('downloadLink');
                    dl.href = dataUrl;
                    dl.download = 'yuva-shakti-poster.png';
                    dl.style.display = 'block';

                    document.getElementById('previewJumpBtn').style.display = 'block';
                    document.getElementById('newPosterBtn').style.display = 'block';

                    hasData = true;
                    startSessionTimer();

                    showLoader(false);
                    showNotification('🎉 पोस्टर तैयार है! Download करो।', 'success');
                    setTimeout(scrollToPreview, 600);
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
    if (!response.ok) throw new Error('BG removal failed: ' + response.status);
    return await response.blob();
}

// ─── SCROLL TO PREVIEW ────────────────────────
function scrollToPreview() {
    document.getElementById('outputSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
