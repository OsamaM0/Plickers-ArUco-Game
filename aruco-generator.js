// ArUco Marker Generator Logic
// Based on the original arucogen project

let dict = null;
let generatedMarkers = []; // Store all generated markers
let currentMarkerIndex = 0; // Current viewing index

// Load dictionary data
const loadDict = fetch('./src/arcogen_dict.json').then(res => res.json()).then(json => {
    dict = json;
    console.log('Dictionary loaded successfully');
});

function generateMarkerSvg(width, height, bits, fixPdfArtifacts = true, markerId = null) {
    // Increased viewBox to accommodate labels
    const padding = 0.4; // Space for labels
    const totalSize = width + 2 + (padding * 2);
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + totalSize + ' ' + totalSize);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('shape-rendering', 'crispEdges');

    // White background for entire area
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', 0);
    bgRect.setAttribute('y', 0);
    bgRect.setAttribute('width', totalSize);
    bgRect.setAttribute('height', totalSize);
    bgRect.setAttribute('fill', 'white');
    svg.appendChild(bgRect);

    // Black background for marker area
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', padding);
    rect.setAttribute('y', padding);
    rect.setAttribute('width', width + 2);
    rect.setAttribute('height', height + 2);
    rect.setAttribute('fill', 'black');
    svg.appendChild(rect);

    // "Pixels" - adjusted for padding
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            const white = bits[i * height + j];
            if (!white) continue;

            const pixel = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            pixel.setAttribute('width', 1);
            pixel.setAttribute('height', 1);
            pixel.setAttribute('x', j + 1 + padding);
            pixel.setAttribute('y', i + 1 + padding);
            pixel.setAttribute('fill', 'white');
            svg.appendChild(pixel);

            if (!fixPdfArtifacts) continue;

            if ((j < width - 1) && (bits[i * height + j + 1])) {
                pixel.setAttribute('width', 1.5);
            }

            if ((i < height - 1) && (bits[(i + 1) * height + j])) {
                const pixel2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                pixel2.setAttribute('width', 1);
                pixel2.setAttribute('height', 1.5);
                pixel2.setAttribute('x', j + 1 + padding);
                pixel2.setAttribute('y', i + 1 + padding);
                pixel2.setAttribute('fill', 'white');
                svg.appendChild(pixel2);
            }
        }
    }

    // Add labels if marker ID is provided
    if (markerId !== null) {
        const center = totalSize / 2;
        const markerCenter = padding + (width + 2) / 2;
        const fontSize = 0.3;
        const idFontSize = 0.2;
        
        // Define answer positions and rotations
        const labels = [
            { answer: 'A', id: `ID:${markerId}`, x: center, y: 0.3, rotation: 0 },      // Top
            { answer: 'B', id: `ID:${markerId}`, x: totalSize - 0.3, y: center, rotation: 90 },  // Right
            { answer: 'C', id: `ID:${markerId}`, x: center, y: totalSize - 0.3, rotation: 180 }, // Bottom
            { answer: 'D', id: `ID:${markerId}`, x: 0.3, y: center, rotation: 270 }      // Left
        ];

        labels.forEach(label => {
            // Create a group for rotation
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            
            // Answer letter (larger)
            const answerText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            answerText.setAttribute('x', label.x);
            answerText.setAttribute('y', label.y);
            answerText.setAttribute('font-size', fontSize);
            answerText.setAttribute('font-weight', 'bold');
            answerText.setAttribute('font-family', 'Arial, sans-serif');
            answerText.setAttribute('text-anchor', 'middle');
            answerText.setAttribute('fill', '#333');
            answerText.textContent = label.answer;
            
            // ID text (smaller, below answer)
            const idText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            idText.setAttribute('x', label.x - 3.3);
            idText.setAttribute('y', label.y );
            idText.setAttribute('font-size', idFontSize);
            idText.setAttribute('font-family', 'Arial, sans-serif');
            idText.setAttribute('text-anchor', 'middle');
            idText.setAttribute('fill', '#666');
            idText.textContent = label.id;
            
            if (label.rotation !== 0) {
                // Rotate the entire group around its position
                group.setAttribute('transform', `rotate(${label.rotation} ${label.x} ${label.y})`);
            }
            
            group.appendChild(answerText);
            group.appendChild(idText);
            svg.appendChild(group);
        });
    }

    return svg;
}

function generateArucoMarker(width, height, dictName, id, includeLabels = true) {
    console.log('Generate ArUco marker ' + dictName + ' ' + id);

    const bytes = dict[dictName][id];
    const bits = [];
    const bitsCount = width * height;

    // Parse marker's bytes
    for (let byte of bytes) {
        const start = bitsCount - bits.length;
        for (let i = Math.min(7, start - 1); i >= 0; i--) {
            bits.push((byte >> i) & 1);
        }
    }

    return generateMarkerSvg(width, height, bits, true, includeLabels ? id : null);
}

function updateMarkerPreview() {
    const dictSelect = document.getElementById('teacher-dict');
    const markerIdInput = document.getElementById('teacher-id');
    const sizeInput = document.getElementById('teacher-size');
    const studentNameInput = document.getElementById('student-name');
    
    const markerId = Number(markerIdInput.value);
    const size = Number(sizeInput.value);
    const option = dictSelect.options[dictSelect.selectedIndex];
    const dictName = option.value;
    const width = Number(option.getAttribute('data-width'));
    const height = Number(option.getAttribute('data-height'));
    const studentName = studentNameInput.value;
    
    // Update displays
    document.getElementById('markerIdDisplay').textContent = `ID: ${markerId}`;
    document.getElementById('studentNameDisplay').textContent = studentName || '';
    
    // Wait until dict data is loaded
    loadDict.then(() => {
        // Generate marker
        const svg = generateArucoMarker(width, height, dictName, markerId);
        svg.setAttribute('width', size + 'mm');
        svg.setAttribute('height', size + 'mm');
        document.getElementById('markerPreview').innerHTML = svg.outerHTML;
    });
}

function addMarkerToList() {
    const dictSelect = document.getElementById('teacher-dict');
    const markerIdInput = document.getElementById('teacher-id');
    const sizeInput = document.getElementById('teacher-size');
    const studentNameInput = document.getElementById('student-name');
    
    const markerId = Number(markerIdInput.value);
    const size = Number(sizeInput.value);
    const option = dictSelect.options[dictSelect.selectedIndex];
    const dictName = option.value;
    const width = Number(option.getAttribute('data-width'));
    const height = Number(option.getAttribute('data-height'));
    const studentName = studentNameInput.value || 'Student';
    
    // Check if marker already exists
    const exists = generatedMarkers.some(m => m.id === markerId && m.name === studentName);
    if (exists) {
        showNotification('This marker already exists in the list!', 'warning');
        return;
    }
    
    loadDict.then(() => {
        // Generate marker
        const svg = generateArucoMarker(width, height, dictName, markerId);
        svg.setAttribute('width', size + 'mm');
        svg.setAttribute('height', size + 'mm');
        
        // Add to list
        generatedMarkers.push({
            id: markerId,
            name: studentName,
            dictName: dictName,
            width: width,
            height: height,
            size: size,
            svg: svg.outerHTML
        });
        
        // Update UI
        updateMarkersList();
        showNotification(`Added marker for ${studentName} (ID: ${markerId})`, 'success');
        
        // Auto-increment ID for next student
        markerIdInput.value = markerId + 1;
        studentNameInput.value = '';
        studentNameInput.focus();
    });
}

function updateMarkersList() {
    const listContainer = document.getElementById('markersList');
    
    if (generatedMarkers.length === 0) {
        listContainer.innerHTML = `
            <div class="no-markers">
                <p>No markers added yet</p>
                <small>Add students using the form above</small>
            </div>
        `;
        document.getElementById('exportPdfBtn').disabled = true;
        document.getElementById('clearAllBtn').disabled = true;
        return;
    }
    
    document.getElementById('exportPdfBtn').disabled = false;
    document.getElementById('clearAllBtn').disabled = false;
    
    listContainer.innerHTML = generatedMarkers.map((marker, index) => `
        <div class="marker-list-item ${index === currentMarkerIndex ? 'active' : ''}" 
             onclick="viewMarker(${index})">
            <div class="marker-item-info">
                <div class="marker-item-name">${marker.name}</div>
                <div class="marker-item-id">ID: ${marker.id}</div>
            </div>
            <div class="marker-item-actions">
                <button class="btn-icon" onclick="event.stopPropagation(); removeMarker(${index})" title="Remove">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
    
    // Update counter
    document.getElementById('markersCount').textContent = generatedMarkers.length;
    
    // Show current marker in preview
    if (generatedMarkers.length > 0) {
        viewMarker(currentMarkerIndex);
    }
}

function viewMarker(index) {
    if (index < 0 || index >= generatedMarkers.length) return;
    
    currentMarkerIndex = index;
    const marker = generatedMarkers[index];
    
    // Update preview
    document.getElementById('markerIdDisplay').textContent = `ID: ${marker.id}`;
    document.getElementById('studentNameDisplay').textContent = marker.name;
    document.getElementById('markerPreview').innerHTML = marker.svg;
    
    // Update list UI
    updateMarkersList();
}

function removeMarker(index) {
    const marker = generatedMarkers[index];
    if (confirm(`Remove marker for ${marker.name} (ID: ${marker.id})?`)) {
        generatedMarkers.splice(index, 1);
        
        // Adjust current index if needed
        if (currentMarkerIndex >= generatedMarkers.length) {
            currentMarkerIndex = Math.max(0, generatedMarkers.length - 1);
        }
        
        updateMarkersList();
        showNotification('Marker removed', 'success');
    }
}

function clearAllMarkers() {
    if (generatedMarkers.length === 0) return;
    
    if (confirm(`Clear all ${generatedMarkers.length} markers?`)) {
        generatedMarkers = [];
        currentMarkerIndex = 0;
        updateMarkersList();
        showNotification('All markers cleared', 'success');
    }
}

async function exportMarkersToPdf() {
    if (generatedMarkers.length === 0) {
        showNotification('No markers to export!', 'warning');
        return;
    }
    
    // Load jsPDF library if not already loaded
    if (typeof window.jspdf === 'undefined') {
        await loadJsPDF();
    }
    
    const { jsPDF } = window.jspdf;
    // Always export to a fixed-size square page (350mm x 350mm)
    const MARKER_MM = 350;
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [MARKER_MM, MARKER_MM]
    });
    // Suggest initial zoom; viewers may ignore this setting
    if (typeof pdf.setDisplayMode === 'function') {
        try { pdf.setDisplayMode(1.0, 'single', 'UseNone'); } catch (_) { /* ignored */ }
    }
    
    for (let i = 0; i < generatedMarkers.length; i++) {
        const marker = generatedMarkers[i];
        
        // Add new page for each marker except the first one
        if (i > 0) {
            pdf.addPage();
        }
        
        // Convert SVG to canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const svgBlob = new Blob([marker.svg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        await new Promise((resolve) => {
            const img = new Image();
            img.onload = function() {
                // Render at fixed size (350mm) at print quality (300 DPI)
                const DPI = 300;
                const mmToPx = (mm) => Math.round((mm / 25.4) * DPI);
                const targetPx = mmToPx(MARKER_MM);
                canvas.width = targetPx;
                canvas.height = targetPx;

                // Draw the SVG image into the canvas at full resolution
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Place image to fill entire page
                const x = 0;
                const y = 0;
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, MARKER_MM, MARKER_MM);
                
                URL.revokeObjectURL(url);
                resolve();
            };
            img.src = url;
        });
        // When multiple markers, add a new fixed-size page for each
        if (i < generatedMarkers.length - 1) {
            pdf.addPage([MARKER_MM, MARKER_MM]);
        }
    }
    
    // Save PDF
    const dictName = generatedMarkers[0].dictName;
    pdf.save(`ArUco_Markers_${dictName}_${generatedMarkers.length}students_350mm.pdf`);
    showNotification(`PDF exported successfully! (${generatedMarkers.length} markers)`, 'success');
}

function loadJsPDF() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function generateMarker() {
    // Legacy function - just add to list now
    addMarkerToList();
}

function showNotification(message, type = 'info') {
    // Create notification if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.className = `notification notification-${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Initialize on page load
if (document.getElementById('teacher-dict')) {
    document.getElementById('teacher-dict').addEventListener('change', updateMarkerPreview);
    document.getElementById('teacher-id').addEventListener('input', updateMarkerPreview);
    document.getElementById('teacher-size').addEventListener('input', updateMarkerPreview);
    document.getElementById('student-name').addEventListener('input', updateMarkerPreview);
    
    // Initial preview
    updateMarkerPreview();
}
