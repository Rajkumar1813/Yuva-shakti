// Show notification
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

document.getElementById('imageUpload').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.getElementById('preview');
            img.src = e.target.result;
            img.classList.remove('hidden');
            document.getElementById('processBtn').disabled = false;
            showNotification('Image uploaded successfully!', 'success');
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('processBtn').addEventListener('click', function () {
    // Show loader
    const loader = document.getElementById('loader');
    loader.classList.remove('hidden');

    const img = document.getElementById('preview');
    const canvas = document.getElementById('output');
    const ctx = canvas.getContext('2d');

    // Get the user's name or use default
    const userName = document.getElementById('userName').value || 'युवा शक्ति';

    // Load the background image from the provided URL
    const backgroundImg = new Image();
    backgroundImg.src = 'https://ik.imagekit.io/ohiabhist/yuva.png?updatedAt=1741420104589'; // Direct URL for the background image
    backgroundImg.crossOrigin = "Anonymous"; // Allow cross-origin loading
    backgroundImg.onload = function () {
        // Remove background using remove.bg API
        removeBackground(img.src)
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const imgNoBg = new Image();
                imgNoBg.src = url;
                imgNoBg.crossOrigin = "Anonymous"; // Allow cross-origin loading
                imgNoBg.onload = function () {
                    // Set canvas dimensions to match the background image
                    canvas.width = backgroundImg.width;
                    canvas.height = backgroundImg.height;

                    // Draw the background image
                    ctx.drawImage(backgroundImg, 0, 0);

                    // Crop the user's image into a circle
                    const circleSize = 265; // Diameter of the circle
                    const x = canvas.width - circleSize - 50; // Position from the right
                    const y = 50; // Position from the top

                    // Create a circular clipping path
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(x + circleSize / 2, y + circleSize / 2, circleSize / 2, 0, Math.PI * 2, true);
                    ctx.closePath();
                    ctx.clip();

                    // Draw the user's image (cropped into a circle)
                    ctx.drawImage(imgNoBg, x, y, circleSize, circleSize);

                    // Restore the context to remove the clipping path
                    ctx.restore();

                    // Add the user's name below the circular image
                    ctx.font = '24px Arial'; // Increased font size
                    ctx.fillStyle = 'red';
                    ctx.textAlign = 'center';
                    ctx.fillText(userName, x + circleSize / 2, y + circleSize + 30);

                    // Convert canvas to image and display it
                    const finalOutput = document.getElementById('finalOutput');
                    finalOutput.src = canvas.toDataURL('image/png');
                    finalOutput.classList.remove('hidden');

                    // Hide loader after processing is complete
                    loader.classList.add('hidden');

                    // Show download link
                    const downloadLink = document.getElementById('downloadLink');
                    downloadLink.href = canvas.toDataURL('image/png');
                    downloadLink.download = 'modified-image.png';
                    downloadLink.classList.remove('hidden');

                    // Show success notification
                    showNotification('Image processed successfully!', 'success');
                };
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Failed to process the image. Please try again.', 'error');
                // Hide loader in case of error
                loader.classList.add('hidden');
            });
    };
});

async function removeBackground(imageUrl) {
    const apiKey = 'hiNp8mxmp7HDZVo7vKdBAan5'; // Your remove.bg API key
    const formData = new FormData();
    formData.append('image_file', await fetch(imageUrl).then(r => r.blob()));
    formData.append('size', 'auto');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
            'X-Api-Key': apiKey,
        },
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Background removal failed');
    }

    return await response.blob();
}

// Scroll to Top Button
const scrollToTopButton = document.getElementById('scrollToTop');
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        scrollToTopButton.style.display = 'block';
    } else {
        scrollToTopButton.style.display = 'none';
    }
});
scrollToTopButton.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});
