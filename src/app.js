// Main Application Logic

// Mode switching
document.addEventListener('DOMContentLoaded', () => {
    const modeButtons = document.querySelectorAll('.mode-btn');
    const modeContents = document.querySelectorAll('.mode-content');
    
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-mode');
            
            // Update button states
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update content visibility
            modeContents.forEach(content => {
                if (content.id === `${mode}Mode`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
            
            // Stop scanning when switching modes
            if (mode === 'teacher' && isScanning) {
                stopScanning();
            }
        });
    });
});

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Styles for notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        font-weight: 600;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
    `;
    
    // Color based on type
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#6366f1'
    };
    
    notification.style.borderLeft = `4px solid ${colors[type] || colors.info}`;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Stop scanning function
function stopScanning() {
    isScanning = false;
    if (pre_stream) {
        pre_stream.getVideoTracks().forEach(camera => {
            camera.stop();
        });
        pre_stream = null;
    }
    if (player) {
        player.srcObject = null;
    }
}

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Alt+T for Teacher mode
    if (e.altKey && e.key === 't') {
        e.preventDefault();
        document.querySelector('.mode-btn[data-mode="teacher"]').click();
    }
    
    // Alt+S for Student mode
    if (e.altKey && e.key === 's') {
        e.preventDefault();
        document.querySelector('.mode-btn[data-mode="student"]').click();
    }
    
    // Space to start scanning in student mode
    if (e.code === 'Space' && document.getElementById('studentMode').classList.contains('active')) {
        e.preventDefault();
        if (!isScanning) {
            startScanning();
        }
    }
});

// Print functionality for teacher mode
window.addEventListener('beforeprint', () => {
    // Ensure only the marker preview is visible when printing
    document.body.classList.add('printing');
});

window.addEventListener('afterprint', () => {
    document.body.classList.remove('printing');
});

// Help/Tutorial overlay (optional feature)
function showHelp() {
    const helpOverlay = document.createElement('div');
    helpOverlay.className = 'help-overlay';
    helpOverlay.innerHTML = `
        <div class="help-content">
            <h2>🎓 How to Use ArUco Quiz Game</h2>
            
            <div class="help-section">
                <h3>👨‍🏫 Teacher Mode</h3>
                <ol>
                    <li>Enter student name and unique marker ID</li>
                    <li>Click "Generate & Download" to create ArUco marker</li>
                    <li>Print the marker and give it to the student</li>
                    <li>Each marker has 4 sides: A, B, C, D</li>
                </ol>
            </div>
            
            <div class="help-section">
                <h3>👨‍🎓 Student Mode</h3>
                <ol>
                    <li>Click "Start Scanning"</li>
                    <li>Hold your marker up to the camera</li>
                    <li>Rotate to show your answer:
                        <ul>
                            <li><strong>A</strong> - Hold normally (top up)</li>
                            <li><strong>B</strong> - Rotate 90° (right side up)</li>
                            <li><strong>C</strong> - Rotate 180° (upside down)</li>
                            <li><strong>D</strong> - Rotate 270° (left side up)</li>
                        </ul>
                    </li>
                    <li>Your answer appears on the board in real-time!</li>
                </ol>
            </div>
            
            <div class="help-section">
                <h3>⌨️ Keyboard Shortcuts</h3>
                <ul>
                    <li><kbd>Alt + T</kbd> - Switch to Teacher Mode</li>
                    <li><kbd>Alt + S</kbd> - Switch to Student Mode</li>
                    <li><kbd>Space</kbd> - Start/Stop Scanning</li>
                </ul>
            </div>
            
            <button class="btn btn-primary" onclick="this.closest('.help-overlay').remove()">
                Got it!
            </button>
        </div>
    `;
    
    helpOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
    `;
    
    const helpContent = helpOverlay.querySelector('.help-content');
    helpContent.style.cssText = `
        background: white;
        border-radius: 20px;
        padding: 40px;
        max-width: 700px;
        max-height: 90vh;
        overflow-y: auto;
    `;
    
    document.body.appendChild(helpOverlay);
}

// Add help button to header
setTimeout(() => {
    const header = document.querySelector('.header');
    const helpBtn = document.createElement('button');
    helpBtn.className = 'btn-help';
    helpBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
    `;
    helpBtn.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        color: white;
        border: none;
        cursor: pointer;
        box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        z-index: 1000;
    `;
    
    helpBtn.addEventListener('click', showHelp);
    helpBtn.addEventListener('mouseenter', () => {
        helpBtn.style.transform = 'scale(1.1)';
    });
    helpBtn.addEventListener('mouseleave', () => {
        helpBtn.style.transform = 'scale(1)';
    });
    
    document.body.appendChild(helpBtn);
}, 1000);

console.log('🎓 ArUco Quiz Game loaded successfully!');
console.log('💡 Press Alt+T for Teacher Mode, Alt+S for Student Mode');
