// ArUco Detector Logic
// Based on the original detection web app with orientation detection for A, B, C, D answers

let player = null;
let src = null;
let dst = null;
let cap = null;
let isCvLoaded = false;
let isScanning = false;
let pre_stream = null;
let detectedMarkers = new Map(); // Store marker ID -> answer mapping
let currentFrameMarkers = new Map(); // Track markers in current frame
let markerTrackingData = new Map(); // Track when markers are first seen and continuously visible
const REQUIRED_VISIBILITY_TIME = 2500; // 2.5 seconds in milliseconds

function onOpenCvReady() {
    if (cv.getBuildInformation) {
        console.log(cv.getBuildInformation());
        isCvLoaded = true;
        showNotification('OpenCV loaded successfully! ✓', 'success');
    } else {
        cv['onRuntimeInitialized'] = () => {
            console.log(cv.getBuildInformation());
            isCvLoaded = true;
            showNotification('OpenCV loaded successfully! ✓', 'success');
        }
    }
}

// Hysteresis margin to avoid rapid flipping when angle hovers near boundaries
const ORIENTATION_MARGIN_DEG = 12; // degrees on each side of quadrant boundary

/**
 * Robust orientation classifier with hysteresis.
 * We use the edge from corner[0] (top-left as seen) to corner[1] (top-right as seen)
 * which represents the local +X axis of the marker in the image. Its angle in the
 * image plane gives rotation about the camera Z axis. Perspective tilt (pitch/roll)
 * changes corner positions but not the dominant in-plane angle much, so answers remain stable.
 *
 * @param {cv.Mat} corners - 1x4x1x2 float matrix of marker corners (clockwise order)
 * @param {number|undefined} prevAngle - Previously stored raw angle (0-360)
 * @param {string|undefined} prevAnswer - Previously stable answer classification
 * @returns {{answer:string, angle:number}} Stable answer + current raw angle
 */
function getOrientationAnswer(corners, prevAngle, prevAnswer) {
    // Extract corners
    const lt_x = corners.floatAt(0, 0 * corners.channels());
    const lt_y = corners.floatAt(0, 0 * corners.channels() + 1);
    const rt_x = corners.floatAt(0, 1 * corners.channels());
    const rt_y = corners.floatAt(0, 1 * corners.channels() + 1);
    const rb_x = corners.floatAt(0, 2 * corners.channels());
    const rb_y = corners.floatAt(0, 2 * corners.channels() + 1);
    const lb_x = corners.floatAt(0, 3 * corners.channels());
    const lb_y = corners.floatAt(0, 3 * corners.channels() + 1);

    // Vector of top edge (corner0 -> corner1)
    let edge_dx = rt_x - lt_x;
    let edge_dy = rt_y - lt_y;

    // Raw angle of top edge in degrees (atan2 returns -180..180)
    let angle = Math.atan2(edge_dy, edge_dx) * 180 / Math.PI;
    if (angle < 0) angle += 360; // normalize to 0..360

    // Map angle to quadrant answers.
    // Define nominal quadrant centers for answers (tunable depending on card print):
    // We assume printed baseline orientation (answer A) has top edge roughly horizontal.
    // Angle ranges (center +- 45):
    // A:  -45..45  => 315..360 or 0..45
    // D:  45..135
    // C: 135..225
    // B: 225..315

    // Helper to classify without hysteresis
    const classify = (a) => {
        if ((a >= 315 && a < 360) || (a >= 0 && a < 45)) return 'A';
        if (a >= 45 && a < 135) return 'D';
        if (a >= 135 && a < 225) return 'C';
        return 'B'; // 225 - 315
    };

    let freshAnswer = classify(angle);

    // If no previous answer, return directly
    if (!prevAnswer || prevAngle === undefined) {
        return { answer: freshAnswer, angle };
    }

    // Determine if angle crossed a boundary sufficiently (with margin) to accept new answer
    // Boundaries at 45,135,225,315. For wrap-around handle 0/360.
    const boundaries = [45,135,225,315];

    // Compute smallest angular distance function
    const angDist = (a,b) => {
        let d = Math.abs(a-b);
        return d > 180 ? 360 - d : d;
    };

    // If freshAnswer differs, ensure angle is at least margin away from the nearest boundary that separates them
    if (freshAnswer !== prevAnswer) {
        // Find the boundary between prevAnswer and freshAnswer
        // We'll just require the new angle to be > margin away from ANY boundary to reduce flicker
        const nearBoundary = boundaries.some(b => angDist(angle, b) < ORIENTATION_MARGIN_DEG);
        if (nearBoundary) {
            // Stay with previous until decisively past boundary
            return { answer: prevAnswer, angle };
        }
    }

    return { answer: freshAnswer, angle };
}

function getDictConstant(dictName) {
    const dictMap = {
        'DICT_4X4_50': cv.DICT_4X4_50,
        'DICT_4X4_100': cv.DICT_4X4_100,
        'DICT_4X4_250': cv.DICT_4X4_250,
        'DICT_4X4_1000': cv.DICT_4X4_1000,
        'DICT_5X5_50': cv.DICT_5X5_50,
        'DICT_5X5_100': cv.DICT_5X5_100,
        'DICT_5X5_250': cv.DICT_5X5_250,
        'DICT_5X5_1000': cv.DICT_5X5_1000,
        'DICT_6X6_50': cv.DICT_6X6_50,
        'DICT_6X6_100': cv.DICT_6X6_100,
        'DICT_6X6_250': cv.DICT_6X6_250,
        'DICT_6X6_1000': cv.DICT_6X6_1000,
        'DICT_7X7_50': cv.DICT_7X7_50,
        'DICT_7X7_100': cv.DICT_7X7_100,
        'DICT_7X7_250': cv.DICT_7X7_250,
        'DICT_7X7_1000': cv.DICT_7X7_1000
    };
    return dictMap[dictName] || cv.DICT_4X4_250;
}

function startScanning() {
    if (!isCvLoaded) {
        showNotification('OpenCV is still loading. Please wait...', 'warning');
        return;
    }
    
    isScanning = true;
    player = document.getElementById('videoInput');
    
    const facingMode = document.getElementById('student-camera').value;
    const constraints = {
        video: {
            facingMode: facingMode === 'environment' ? { exact: "environment" } : 'user'
        }
    };
    
    // Stop previous stream if exists
    if (pre_stream !== null) {
        pre_stream.getVideoTracks().forEach(camera => {
            camera.stop();
        });
    }
    
    // Start video
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            pre_stream = stream;
            player.srcObject = stream;
            player.addEventListener('canplay', onVideoCanPlay, false);
            showNotification('Camera started! Show your ArUco marker', 'success');
        })
        .catch(err => {
            console.error('Camera error:', err);
            isScanning = false;
            
            // Provide specific error messages
            let errorMessage = 'Camera access failed. ';
            
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errorMessage = '❌ Camera permission denied. Please allow camera access and try again.';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                errorMessage = '❌ No camera found on this device.';
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                errorMessage = '❌ Camera is being used by another application.';
            } else if (err.name === 'OverconstrainedError') {
                errorMessage = '❌ The selected camera mode is not supported. Try switching camera.';
            } else if (err.name === 'NotSupportedError') {
                errorMessage = '⚠️ Camera not supported. This site requires HTTPS connection. Use https:// instead of http://';
            } else if (err.name === 'TypeError') {
                errorMessage = '⚠️ HTTPS required! Camera access only works on secure connections (https://).';
            } else {
                errorMessage = `❌ Camera error: ${err.message || err.name || 'Unknown error'}`;
            }
            
            showNotification(errorMessage, 'error');
            
            // Show additional help for HTTPS issue
            if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                setTimeout(() => {
                    showNotification('💡 Tip: Use the HTTPS server script (https_server.py) for mobile access!', 'warning');
                }, 3500);
            }
        });
}

function onVideoCanPlay() {
    player.width = player.videoWidth;
    player.height = player.videoHeight;
    const canvas = document.getElementById('canvasOutput');
    canvas.width = player.videoWidth;
    canvas.height = player.videoHeight;
    setTimeout(processVideo, 100);
}

const FPS = 30;
let shouldUpdateBoard = false; // Flag to control board updates

function processVideo() {
    if (!isScanning) return;
    
    const select_dict = document.getElementById('student-dict').value;
    const dict = getDictConstant(select_dict);
    
    try {
        if (!isCvLoaded) {
            setTimeout(processVideo, 100);
            return;
        } else if (cap == null) {
            cap = new cv.VideoCapture(player);
        }
        
        const begin = Date.now();
        
        // Start processing
        src = new cv.Mat(player.height, player.width, cv.CV_8UC4);
        dst = new cv.Mat();
        cap.read(src);
        
        const dictionary = new cv.Dictionary(dict);
        const markerIds = new cv.Mat();
        const markerCorners = new cv.MatVector();
        
        cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
        cv.detectMarkers(src, dictionary, markerCorners, markerIds);
        
        // Clear current frame markers
        currentFrameMarkers.clear();
        shouldUpdateBoard = false;
        
        if (markerIds.rows > 0) {
            const vec_length = 0.75;
            const line_color = new cv.Scalar(0, 255, 255);
            const x_vec_color = new cv.Scalar(255, 0, 0);
            const y_vec_color = new cv.Scalar(0, 255, 0);
            const text_color = new cv.Scalar(0, 0, 255);
            const text_white = new cv.Scalar(255, 255, 255);
            const text_size = 1.5;
            
            for (let i = 0; i < markerCorners.size(); i++) {
                const corner = markerCorners.get(i);
                const id = markerIds.intAt(i, 0);
                
                // Get corners
                const lt_x = corner.floatAt(0, 0 * corner.channels());
                const lt_y = corner.floatAt(0, 0 * corner.channels() + 1);
                const rt_x = corner.floatAt(0, 1 * corner.channels());
                const rt_y = corner.floatAt(0, 1 * corner.channels() + 1);
                const rb_x = corner.floatAt(0, 2 * corner.channels());
                const rb_y = corner.floatAt(0, 2 * corner.channels() + 1);
                const lb_x = corner.floatAt(0, 3 * corner.channels());
                const lb_y = corner.floatAt(0, 3 * corner.channels() + 1);
                
                const lt = new cv.Point(lt_x, lt_y);
                const rt = new cv.Point(rt_x, rt_y);
                const rb = new cv.Point(rb_x, rb_y);
                const lb = new cv.Point(lb_x, lb_y);
                
                const marker_x = (lt_x + rt_x + rb_x + lb_x) / 4;
                const marker_y = (lt_y + rt_y + rb_y + lb_y) / 4;
                const marker_center = new cv.Point(marker_x, marker_y);
                
                // Draw marker outline
                cv.line(src, lt, rt, line_color, 3);
                cv.line(src, rt, rb, line_color, 3);
                cv.line(src, rb, lb, line_color, 3);
                cv.line(src, lb, lt, line_color, 3);
                
                // Draw orientation vectors
                const x_vec_x = ((rt_x + rb_x) - (lt_x + lb_x)) / 2 * vec_length;
                const x_vec_y = ((rt_y + rb_y) - (lt_y + lb_y)) / 2 * vec_length;
                const y_vec_x = ((lt_x + rt_x) - (lb_x + rb_x)) / 2 * vec_length;
                const y_vec_y = ((lt_y + rt_y) - (lb_y + rb_y)) / 2 * vec_length;
                
                const x_vec_end = new cv.Point(marker_x + x_vec_x, marker_y + x_vec_y);
                cv.line(src, marker_center, x_vec_end, x_vec_color, 3, cv.LINE_AA, 0);
                
                const y_vec_end = new cv.Point(marker_x + y_vec_x, marker_y + y_vec_y);
                cv.line(src, marker_center, y_vec_end, y_vec_color, 3, cv.LINE_AA, 0);
                
                // Determine answer based on orientation (with hysteresis)
                const prevTrack = markerTrackingData.get(id);
                const { answer, angle } = getOrientationAnswer(corner, prevTrack?.angle, prevTrack?.answer);
                
                // Track this marker in current frame
                currentFrameMarkers.set(id, answer);
                
                // Get current time
                const currentTime = Date.now();
                
                // Check tracking data for this marker
                const trackingData = markerTrackingData.get(id);
                
                if (!trackingData) {
                    // First time seeing this marker with this answer - start tracking
                    markerTrackingData.set(id, {
                        answer: answer,
                        angle: angle,
                        firstSeenTime: currentTime,
                        lastSeenTime: currentTime,
                        isConfirmed: false
                    });
                } else if (trackingData.answer === answer) {
                    // Same answer, update last seen time
                    trackingData.lastSeenTime = currentTime;
                    trackingData.angle = angle;
                    
                    // Check if marker has been continuously visible for required time
                    const visibleDuration = currentTime - trackingData.firstSeenTime;
                    
                    if (!trackingData.isConfirmed && visibleDuration >= REQUIRED_VISIBILITY_TIME) {
                        // Marker has been visible long enough - confirm it!
                        trackingData.isConfirmed = true;
                        
                        // Check if this is a new marker or answer has changed
                        const previousData = detectedMarkers.get(id);
                        if (!previousData || previousData.answer !== answer) {
                            // New marker or answer changed - update the stored data
                            detectedMarkers.set(id, {
                                answer: answer,
                                time: new Date().toLocaleTimeString(),
                                justUpdated: true // Mark for flash animation
                            });
                            shouldUpdateBoard = true; // Flag that we need to update the board
                            
                            // Show notification for new/changed answer
                            if (previousData) {
                                showNotification(`Marker ${id} changed: ${previousData.answer} → ${answer}`, 'info');
                            } else {
                                showNotification(`New student detected: ID ${id} answered ${answer}`, 'success');
                            }
                        }
                    }
                } else {
                    // Answer changed while tracking - restart tracking with new answer
                    markerTrackingData.set(id, {
                        answer: answer,
                        angle: angle,
                        firstSeenTime: currentTime,
                        lastSeenTime: currentTime,
                        isConfirmed: false
                    });
                }
                
                // Draw ID and Answer
                const text_pos = new cv.Point(marker_x - 50, marker_y - 20);
                const answer_pos = new cv.Point(marker_x - 50, marker_y + 30);
                
                cv.putText(src, `ID: ${id}`, text_pos, cv.FONT_HERSHEY_SIMPLEX, text_size, text_color, 8.0);
                cv.putText(src, `ID: ${id}`, text_pos, cv.FONT_HERSHEY_SIMPLEX, text_size, text_white, 3.0);
                
                // Answer color based on choice
                let answerColor = new cv.Scalar(59, 130, 246); // Blue for A
                if (answer === 'B') answerColor = new cv.Scalar(16, 185, 129); // Green
                else if (answer === 'C') answerColor = new cv.Scalar(245, 158, 11); // Orange
                else if (answer === 'D') answerColor = new cv.Scalar(239, 68, 68); // Red
                
                cv.putText(src, `Answer: ${answer}`, answer_pos, cv.FONT_HERSHEY_SIMPLEX, text_size, text_color, 8.0);
                cv.putText(src, `Answer: ${answer}`, answer_pos, cv.FONT_HERSHEY_SIMPLEX, text_size, answerColor, 3.0);
                
                // Show tracking progress if marker is being tracked but not yet confirmed
                const currentTrackingData = markerTrackingData.get(id);
                if (currentTrackingData && !currentTrackingData.isConfirmed) {
                    const visibleDuration = Date.now() - currentTrackingData.firstSeenTime;
                    const progress = Math.min(visibleDuration / REQUIRED_VISIBILITY_TIME, 1.0);
                    const percentage = Math.floor(progress * 100);
                    
                    // Draw progress text
                    const progress_pos = new cv.Point(marker_x - 50, marker_y + 70);
                    const progressText = `Tracking: ${percentage}%`;
                    const progressColor = new cv.Scalar(255, 165, 0); // Orange
                    cv.putText(src, progressText, progress_pos, cv.FONT_HERSHEY_SIMPLEX, 1.0, text_color, 6.0);
                    cv.putText(src, progressText, progress_pos, cv.FONT_HERSHEY_SIMPLEX, 1.0, progressColor, 2.0);
                }
            }
            
            // Only update UI if there were changes
            if (shouldUpdateBoard) {
                updateResultsBoard();
            }
            document.getElementById('detectedCount').textContent = detectedMarkers.size;
        }
        
        // Clean up tracking data for markers that are no longer visible
        const currentTime = Date.now();
        for (const [id, trackingData] of markerTrackingData.entries()) {
            if (!currentFrameMarkers.has(id)) {
                // Marker not visible in this frame
                const timeSinceLastSeen = currentTime - trackingData.lastSeenTime;
                
                // Remove tracking data if marker hasn't been seen for 500ms
                if (timeSinceLastSeen > 500) {
                    markerTrackingData.delete(id);
                }
            }
        }
        
        cv.imshow('canvasOutput', src);
        src.delete();
        dst.delete();
        
        // Schedule next frame
        const delay = 1000 / FPS - (Date.now() - begin);
        setTimeout(processVideo, delay);
    } catch (err) {
        console.error('Processing error:', err);
    }
}

function updateResultsBoard() {
    const resultsBoard = document.getElementById('resultsBoard');
    
    if (detectedMarkers.size === 0) {
        resultsBoard.innerHTML = `
            <div class="no-results">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M9 9h.01M15 9h.01M9 15h6"/>
                </svg>
                <p>No markers detected yet</p>
                <small>Point your ArUco marker to the camera</small>
            </div>
        `;
        return;
    }
    
    let html = '';
    const sortedMarkers = Array.from(detectedMarkers.entries()).sort((a, b) => a[0] - b[0]);
    
    for (const [id, data] of sortedMarkers) {
        const answerClass = `answer-${data.answer.toLowerCase()}`;
        const updatedClass = data.justUpdated ? 'updated' : '';
        html += `
            <div class="result-item ${updatedClass}" data-marker-id="${id}">
                <div class="result-header">
                    <span class="result-id">Marker ID: ${id}</span>
                    <span class="result-answer ${answerClass}">${data.answer}</span>
                </div>
                <div class="result-time">Last update: ${data.time}</div>
            </div>
        `;
    }
    
    resultsBoard.innerHTML = html;
    
    // Remove the justUpdated flag after displaying
    detectedMarkers.forEach((value, key) => {
        if (value.justUpdated) {
            value.justUpdated = false;
        }
    });
}

// Clear results function
function clearResults() {
    if (detectedMarkers.size === 0) {
        showNotification('Results board is already empty', 'info');
        return;
    }
    
    if (confirm('Are you sure you want to clear all results? This will reset the board for a new question.')) {
        detectedMarkers.clear();
        currentFrameMarkers.clear();
        markerTrackingData.clear(); // Clear tracking data as well
        updateResultsBoard();
        document.getElementById('detectedCount').textContent = '0';
        showNotification('Results cleared successfully! Ready for new question ✓', 'success');
    }
}

// Camera change handler
if (document.getElementById('student-camera')) {
    document.getElementById('student-camera').addEventListener('change', () => {
        if (isScanning) {
            startScanning(); // Restart with new camera
        }
    });
}
