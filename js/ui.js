function showToast(message, type = 'info') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            background: rgba(0, 0, 0, 0.85);
            border: 2px solid #00d4ff;
            border-radius: 25px;
            color: #fff;
            font-size: 14px;
            font-weight: bold;
            z-index: 2000;
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
            transition: opacity 0.3s, transform 0.3s;
            opacity: 0;
            pointer-events: none;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.borderColor = type === 'error' ? '#ff4d6d' : '#00d4ff';
    toast.style.boxShadow = type === 'error'
        ? '0 0 20px rgba(255, 77, 109, 0.5)'
        : '0 0 20px rgba(0, 212, 255, 0.5)';
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-10px)';
    }, 1500);
}