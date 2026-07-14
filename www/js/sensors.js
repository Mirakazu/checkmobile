/**
 * Module: sensors.js
 * Quản lý tất cả các bài kiểm tra phần cứng tương tác (Màn hình, Cảm ứng, Loa, Camera, Cảm biến, Mic)
 */

const HardwareTester = (() => {
    // Trạng thái kiểm tra toàn cục
    const testResults = {
        screen: null, // null: chưa test, true: Đạt, false: Lỗi
        touch: null,
        audio: null,
        mic: null,
        sensors: null,
        camera: null,
        swollen: null  // null: chưa báo, true: Không phồng, false: Bị phồng
    };

    // --- 1. MÀN HÌNH (SCREEN COLOR TEST) ---
    let screenColors = ['#ff0000', '#00ff00', '#0000ff', '#ffffff', '#000000'];
    let currentColorIndex = 0;

    function startScreenTest() {
        const overlay = document.getElementById('screen-test-overlay');
        if (!overlay) return;
        
        currentColorIndex = 0;
        overlay.style.backgroundColor = screenColors[currentColorIndex];
        overlay.style.display = 'block';
        
        // Rung nhẹ
        vibratePhone(40);
    }

    function nextScreenColor() {
        currentColorIndex++;
        const overlay = document.getElementById('screen-test-overlay');
        
        if (currentColorIndex < screenColors.length) {
            overlay.style.backgroundColor = screenColors[currentColorIndex];
        } else {
            closeScreenTest(null);
            
            // Hỏi phản hồi từ người dùng
            setTimeout(() => {
                const isSuccess = confirm("Kiểm tra màu nền màn hình:\nBạn có nhìn thấy điểm chết, đốm đen hoặc màu sắc bất thường nào không?");
                markTest('screen', !isSuccess); // Nếu có bất thường => Fail, ngược lại => Pass
            }, 100);
        }
    }

    function closeScreenTest(e) {
        if (e) e.stopPropagation(); // Ngăn kích hoạt click nền đổi màu
        const overlay = document.getElementById('screen-test-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    // --- 2. CẢM ỨNG (TOUCH GRID TEST) ---
    let canvas, ctx;
    let gridCols = 8;
    let gridRows = 14;
    let gridCells = [];
    let isDrawing = false;

    function startTouchTest() {
        const overlay = document.getElementById('touch-test-overlay');
        canvas = document.getElementById('touch-canvas');
        if (!overlay || !canvas) return;

        overlay.style.display = 'block';
        
        // Khởi tạo kích thước canvas bằng kích thước thật của container
        resizeCanvas();
        initTouchGrid();
        drawTouchGrid();

        // Lắng nghe sự kiện cảm ứng và chuột
        canvas.addEventListener('mousedown', dragStart);
        canvas.addEventListener('mousemove', dragMove);
        canvas.addEventListener('mouseup', dragEnd);

        canvas.addEventListener('touchstart', touchStart, { passive: false });
        canvas.addEventListener('touchmove', touchMove, { passive: false });
        canvas.addEventListener('touchend', touchEnd);

        window.addEventListener('resize', resizeCanvas);
    }

    function resizeCanvas() {
        if (!canvas) return;
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // Cập nhật lại tọa độ các ô lưới khi resize
        if (gridCells.length > 0) {
            initTouchGrid();
        }
    }

    function initTouchGrid() {
        gridCells = [];
        const cellW = canvas.width / gridCols;
        const cellH = canvas.height / gridRows;

        for (let r = 0; r < gridRows; r++) {
            for (let c = 0; c < gridCols; c++) {
                gridCells.push({
                    x: c * cellW,
                    y: r * cellH,
                    w: cellW,
                    h: cellH,
                    filled: false
                });
            }
        }
    }

    function drawTouchGrid() {
        if (!ctx && canvas) ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Vẽ các ô lưới
        gridCells.forEach(cell => {
            if (cell.filled) {
                ctx.fillStyle = 'rgba(0, 255, 102, 0.6)';
                ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
            }
            
            // Vẽ viền lưới mảnh màu cyan
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);
        });
    }

    // Các hàm xử lý tương tác vẽ
    function checkIntersections(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        let stateChanged = false;

        gridCells.forEach(cell => {
            if (!cell.filled && 
                x >= cell.x && x <= cell.x + cell.w && 
                y >= cell.y && y <= cell.y + cell.h) {
                cell.filled = true;
                stateChanged = true;
                vibratePhone(15); // Rung cực nhẹ khi lấp ô
            }
        });

        if (stateChanged) {
            drawTouchGrid();
            checkGridCompletion();
        }
    }

    function checkGridCompletion() {
        const filledCount = gridCells.filter(c => c.filled).length;
        const ratio = filledCount / gridCells.length;

        // Nếu người dùng lấp đầy hơn 96% lưới cảm ứng => Tự động coi là pass
        if (ratio >= 0.96) {
            setTimeout(() => {
                alert("Chúc mừng! Điểm cảm ứng hoạt động hoàn hảo trên toàn diện tích.");
                closeTouchTest();
                markTest('touch', true);
            }, 100);
        }
    }

    function dragStart(e) {
        isDrawing = true;
        checkIntersections(e.clientX, e.clientY);
    }

    function dragMove(e) {
        if (!isDrawing) return;
        checkIntersections(e.clientX, e.clientY);
    }

    function dragEnd() {
        isDrawing = false;
    }

    function touchStart(e) {
        e.preventDefault();
        isDrawing = true;
        const touch = e.touches[0];
        checkIntersections(touch.clientX, touch.clientY);
    }

    function touchMove(e) {
        e.preventDefault();
        if (!isDrawing) return;
        const touch = e.touches[0];
        checkIntersections(touch.clientX, touch.clientY);
    }

    function touchEnd() {
        isDrawing = false;
    }

    function closeTouchTest() {
        const overlay = document.getElementById('touch-test-overlay');
        if (overlay) overlay.style.display = 'none';

        // Gỡ bỏ các event listeners
        if (canvas) {
            canvas.removeEventListener('mousedown', dragStart);
            canvas.removeEventListener('mousemove', dragMove);
            canvas.removeEventListener('mouseup', dragEnd);
            canvas.removeEventListener('touchstart', touchStart);
            canvas.removeEventListener('touchmove', touchMove);
            canvas.removeEventListener('touchend', touchEnd);
        }
        window.removeEventListener('resize', resizeCanvas);

        // Nếu người dùng đóng sớm mà chưa đầy 96% thì kiểm tra tỷ lệ lấp đầy
        const filledRatio = gridCells.filter(c => c.filled).length / gridCells.length;
        if (filledRatio < 0.96) {
            const accept = confirm(`Lưới cảm ứng mới lấp đầy ${(filledRatio*100).toFixed(0)}%.\nBạn có xác nhận cảm ứng hoạt động tốt không?`);
            markTest('touch', accept);
        }
    }

    // --- 3. LOA & ÂM THANH (AUDIO SPEAKER TEST) ---
    let audioCtx = null;
    let oscNode = null;
    let panNode = null;

    function startAudioTest() {
        const overlay = document.getElementById('audio-test-overlay');
        if (overlay) overlay.style.display = 'flex';
        
        document.getElementById('audio-play-status').textContent = 'Sẵn sàng thử âm';
    }

    function playAudioChannel(channel) {
        try {
            // Khởi tạo AudioContext
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Dừng âm cũ nếu đang chạy
            stopAudioOscillator();

            audioCtx.resume();

            oscNode = audioCtx.createOscillator();
            
            // Sử dụng các tần số khác nhau cho từng bài test
            if (channel === 'left') {
                oscNode.frequency.value = 440; // Nốt A4
                document.getElementById('audio-play-status').textContent = '🔊 Đang phát loa TRÁI (440Hz)';
            } else if (channel === 'right') {
                oscNode.frequency.value = 880; // Nốt A5
                document.getElementById('audio-play-status').textContent = '🔊 Đang phát loa PHẢI (880Hz)';
            } else {
                oscNode.frequency.value = 660; // Nốt E5
                document.getElementById('audio-play-status').textContent = '🔊 Đang phát cả hai loa Stereo (660Hz)';
            }

            // Xử lý Balance Trái/Phải
            if (audioCtx.createStereoPanner) {
                panNode = audioCtx.createStereoPanner();
                if (channel === 'left') panNode.pan.value = -1.0;
                else if (channel === 'right') panNode.pan.value = 1.0;
                else panNode.pan.value = 0.0;

                oscNode.connect(panNode).connect(audioCtx.destination);
            } else {
                // Hỗ trợ thiết bị không hỗ trợ StereoPanner bằng cách cắm thẳng
                oscNode.connect(audioCtx.destination);
            }

            oscNode.start();
            
            // Tự động dừng sau 2.5 giây
            setTimeout(stopAudioOscillator, 2500);

        } catch (err) {
            console.error("Audio API error:", err);
            document.getElementById('audio-play-status').textContent = '❌ Không thể truy cập Audio API';
        }
    }

    function stopAudioOscillator() {
        if (oscNode) {
            try {
                oscNode.stop();
            } catch (e) {}
            oscNode.disconnect();
            oscNode = null;
        }
        if (panNode) {
            panNode.disconnect();
            panNode = null;
        }
        const status = document.getElementById('audio-play-status');
        if (status && status.textContent.startsWith('🔊')) {
            status.textContent = 'Đã dừng phát âm';
        }
    }

    function finishAudioTest(isSuccess) {
        stopAudioOscillator();
        const overlay = document.getElementById('audio-test-overlay');
        if (overlay) overlay.style.display = 'none';

        markTest('audio', isSuccess);
        vibratePhone(100);
    }

    // --- 4. MÁY ẢNH (CAMERA TEST) ---
    let cameraStream = null;
    let cameraFacingMode = 'user'; // 'user' hoặc 'environment'

    async function startCameraTest() {
        const overlay = document.getElementById('camera-test-overlay');
        const fallbackMsg = document.getElementById('camera-fallback-msg');
        const video = document.getElementById('camera-video');
        
        if (overlay) overlay.style.display = 'flex';
        if (fallbackMsg) fallbackMsg.style.display = 'block';
        if (video) video.style.display = 'none';

        await openCamera();
    }

    async function openCamera() {
        const video = document.getElementById('camera-video');
        const fallbackMsg = document.getElementById('camera-fallback-msg');
        
        // Dừng camera cũ nếu đang chạy
        stopCameraStream();

        try {
            const constraints = {
                video: { facingMode: cameraFacingMode },
                audio: false
            };
            
            cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            if (video) {
                video.srcObject = cameraStream;
                video.style.display = 'block';
                if (fallbackMsg) fallbackMsg.style.display = 'none';
            }
        } catch (err) {
            console.error("Camera access error:", err);
            if (fallbackMsg) {
                fallbackMsg.textContent = "Không thể mở camera. Hãy cấp quyền truy cập máy ảnh hoặc xác minh phần cứng hoạt động.";
            }
        }
    }

    function switchCamera() {
        cameraFacingMode = (cameraFacingMode === 'user') ? 'environment' : 'user';
        openCamera();
        vibratePhone(50);
    }

    function capturePhoto() {
        if (!cameraStream) return;
        
        // Hiệu ứng đèn flash nháy trắng
        const container = document.querySelector('.camera-preview-container');
        if (container) {
            container.style.outline = '4px solid white';
            setTimeout(() => container.style.outline = 'none', 150);
        }
        
        vibratePhone(80);
        alert("Đã chụp hình mô phỏng thành công!");
    }

    function stopCameraStream() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
    }

    function finishCameraTest(isSuccess) {
        stopCameraStream();
        const overlay = document.getElementById('camera-test-overlay');
        if (overlay) overlay.style.display = 'none';

        markTest('camera', isSuccess);
        vibratePhone(100);
    }

    // --- 5. CẢM BIẾN GIA TỐC (ACCELEROMETER/GYROSCOPE TEST) ---
    let sensorSimInterval = null;
    let hasRealSensorData = false;

    function startSensorsTest() {
        const overlay = document.getElementById('sensors-test-overlay');
        const fallback = document.getElementById('sensor-fallback');
        
        if (overlay) overlay.style.display = 'flex';
        if (fallback) fallback.style.display = 'block';

        hasRealSensorData = false;

        // Đăng ký nhận sự kiện xoay điện thoại thực tế
        if (window.DeviceOrientationEvent) {
            // Hỗ trợ xin quyền trên iOS 13+
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission()
                    .then(permissionState => {
                        if (permissionState === 'granted') {
                            window.addEventListener('deviceorientation', handleOrientation);
                        } else {
                            startSensorSimulation();
                        }
                    })
                    .catch(() => {
                        startSensorSimulation();
                    });
            } else {
                window.addEventListener('deviceorientation', handleOrientation);
            }
        } else {
            startSensorSimulation();
        }

        // Tạo bộ đếm thời gian an toàn nếu sau 1 giây không có dữ liệu thật thì giả lập
        setTimeout(() => {
            if (!hasRealSensorData) {
                startSensorSimulation();
            }
        }, 1200);
    }

    function handleOrientation(e) {
        // Nếu nhận được dữ liệu thực tế
        if (e.beta !== null || e.gamma !== null) {
            hasRealSensorData = true;
            document.getElementById('sensor-fallback').style.display = 'none';
            stopSensorSimulation();
            
            updateBubblePosition(e.gamma, e.beta);
        }
    }

    function updateBubblePosition(gamma, beta) {
        // Tọa độ lệch tâm (Max deflection ±50px)
        // Gamma (nghiêng trái/phải): thường từ -90 đến 90
        // Beta (nghiêng trước/sau): thường từ -180 đến 180 (chúng ta dùng tầm -90 đến 90)
        
        const gammaClamped = Math.max(-45, Math.min(45, gamma));
        const betaClamped = Math.max(-45, Math.min(45, beta));

        const maxDeflection = 50; 
        const deltaX = (gammaClamped / 45) * maxDeflection;
        const deltaY = (betaClamped / 45) * maxDeflection;

        // Vị trí gốc là 55px (tâm)
        const left = 55 + deltaX;
        const top = 55 + deltaY;

        const bubble = document.getElementById('sensor-bubble');
        if (bubble) {
            bubble.style.left = `${left}px`;
            bubble.style.top = `${top}px`;
        }

        // Cập nhật text hiển thị số liệu cảm biến
        const xText = document.getElementById('sensor-x');
        const yText = document.getElementById('sensor-y');
        const zText = document.getElementById('sensor-z');

        if (xText) xText.textContent = gamma.toFixed(2);
        if (yText) yText.textContent = beta.toFixed(2);
        if (zText) zText.textContent = (e => e.alpha ? e.alpha.toFixed(2) : '0.00')(window);
    }

    // Mô phỏng cảm biến dao động nhẹ mượt mà trên desktop
    function startSensorSimulation() {
        if (sensorSimInterval) return;
        
        let angle = 0;
        sensorSimInterval = setInterval(() => {
            angle += 0.05;
            // Sử dụng hàm sin/cos để bong bóng chuyển động vòng tròn quanh tâm
            const radius = 25; // Bán kính vòng mô phỏng
            const mockGamma = Math.sin(angle) * radius;
            const mockBeta = Math.cos(angle * 1.5) * radius;

            updateBubblePosition(mockGamma, mockBeta);
        }, 30);
    }

    function stopSensorSimulation() {
        if (sensorSimInterval) {
            clearInterval(sensorSimInterval);
            sensorSimInterval = null;
        }
    }

    function finishSensorsTest(isSuccess) {
        stopSensorSimulation();
        window.removeEventListener('deviceorientation', handleOrientation);
        
        const overlay = document.getElementById('sensors-test-overlay');
        if (overlay) overlay.style.display = 'none';

        markTest('sensors', isSuccess);
        vibratePhone(100);
    }

    // --- 6. MICROPHONE TEST (AUDIO LEVEL INPUT) ---
    let micStream = null;
    let micAudioCtx = null;
    let micAnalyser = null;
    let micDataArray = null;
    let micAnimationId = null;

    async function startMicrophoneTest() {
        const overlay = document.getElementById('mic-test-overlay');
        if (overlay) overlay.style.display = 'flex';

        updateMicDecibels(0);

        try {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Cài đặt Web Audio API cho Mic
            micAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = micAudioCtx.createMediaStreamSource(micStream);
            
            micAnalyser = micAudioCtx.createAnalyser();
            micAnalyser.fftSize = 256;
            
            source.connect(micAnalyser);
            
            const bufferLength = micAnalyser.frequencyBinCount;
            micDataArray = new Uint8Array(bufferLength);
            
            // Vẽ đồ thị và đo âm lượng
            drawMicWaveform();

        } catch (err) {
            console.error("Microphone access error:", err);
            updateMicDecibels(0);
            alert("Không thể kết nối micrô. Vui lòng cấp quyền truy cập để tiến hành đo.");
        }
    }

    function drawMicWaveform() {
        const canvas = document.getElementById('mic-visualizer');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.parentElement.clientWidth;
        const height = canvas.height = canvas.parentElement.clientHeight;

        function draw() {
            if (!micAnalyser) return;
            micAnimationId = requestAnimationFrame(draw);

            micAnalyser.getByteFrequencyData(micDataArray);

            ctx.fillStyle = '#11182c';
            ctx.fillRect(0, 0, width, height);

            const barWidth = (width / micDataArray.length) * 1.5;
            let barHeight;
            let x = 0;

            let volumeSum = 0;

            for (let i = 0; i < micDataArray.length; i++) {
                barHeight = micDataArray[i] / 2;
                volumeSum += micDataArray[i];

                // Thiết lập màu sắc dải sóng gradient neon
                ctx.fillStyle = `rgb(${barHeight + 100}, 0, 255)`;
                ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

                x += barWidth;
            }

            // Tính toán mức decibel tương đối từ tổng âm lượng
            const avgVolume = volumeSum / micDataArray.length;
            const db = Math.round((avgVolume / 128) * 90); // Chuẩn hóa về tầm 0 - 90 dB
            updateMicDecibels(db);
        }

        draw();
    }

    function updateMicDecibels(db) {
        const bar = document.getElementById('decibel-bar');
        const text = document.getElementById('decibel-val');
        
        if (bar) {
            bar.style.width = `${Math.min(100, (db / 90) * 100)}%`;
        }
        
        if (text) {
            text.textContent = `${db} dB`;
        }
    }

    function stopMicrophone() {
        if (micAnimationId) {
            cancelAnimationFrame(micAnimationId);
            micAnimationId = null;
        }
        if (micStream) {
            micStream.getTracks().forEach(track => track.stop());
            micStream = null;
        }
        if (micAudioCtx) {
            micAudioCtx.close();
            micAudioCtx = null;
        }
        micAnalyser = null;
    }

    function finishMicrophoneTest(isSuccess) {
        stopMicrophone();
        const overlay = document.getElementById('mic-test-overlay');
        if (overlay) overlay.style.display = 'none';

        markTest('mic', isSuccess);
        vibratePhone(100);
    }

    // --- CÁC HÀM TIỆN ÍCH CHUNG ---

    function vibratePhone(duration) {
        if ('vibrate' in navigator) {
            navigator.vibrate(duration);
        }
    }

    // Ghi nhận kết quả test
    function markTest(testId, isSuccess) {
        testResults[testId] = isSuccess;
        
        const badge = document.getElementById(`status-${testId}`);
        if (badge) {
            if (isSuccess) {
                badge.className = "test-status-badge status-pass";
                badge.textContent = (testId === 'swollen') ? "Không phồng" : "Đạt";
            } else {
                badge.className = "test-status-badge status-fail";
                badge.textContent = (testId === 'swollen') ? "BỊ PHỒNG" : "Lỗi";
            }
        }
        
        // Rung nhẹ xác nhận
        vibratePhone([50, 30, 50]);

        // Cập nhật lại điểm sức khỏe tổng quát ở App chính
        if (window.App) {
            window.App.recalculateHealthScore();
        }
    }

    function resetAllTests() {
        const confirmReset = confirm("Bạn có chắc chắn muốn đặt lại tất cả kết quả chẩn đoán trước đó?");
        if (!confirmReset) return;

        Object.keys(testResults).forEach(key => {
            testResults[key] = null;
            const badge = document.getElementById(`status-${key}`);
            if (badge) {
                badge.className = "test-status-badge status-pending";
                badge.textContent = "Chưa test";
            }
        });

        if (window.App) {
            window.App.recalculateHealthScore();
        }
        vibratePhone(100);
    }

    function startSwollenBatteryCheck() {
        vibratePhone(50);
        
        const isSwollen = confirm(
            "XÁC NHẬN PIN VẬT LÝ:\n\n" +
            "Phần mềm không thể tự phát hiện độ phồng pin. Hãy quan sát ngoại quan máy:\n" +
            "- Mặt lưng có bị cong, gồ lên không?\n" +
            "- Màn hình có bị ép cong, loang mực hoặc hở viền không?\n" +
            "- Có khe hở lớn xuất hiện ở nắp lưng không?\n\n" +
            "-> Bấm OK nếu máy BỊ PHỒNG PIN.\n" +
            "-> Bấm CANCEL nếu máy BÌNH THƯỜNG."
        );

        if (isSwollen) {
            alert(
                "⚠️ CẢNH BÁO NGUY HIỂM CHÁY NỔ!\n\n" +
                "Pin máy đang bị phồng. Đây là hiện tượng nguy hiểm có nguy cơ cháy nổ cao.\n\n" +
                "Khuyên dùng: Bạn hãy lập tức ngừng sạc pin, hạn chế sử dụng điện thoại và mang máy đi thay pin sớm nhất có thể!"
            );
            markTest('swollen', false);
        } else {
            markTest('swollen', true);
        }
    }

    // Trả về báo cáo
    function getTestsReportData() {
        return testResults;
    }

    return {
        startScreenTest,
        nextScreenColor,
        closeScreenTest,
        
        startTouchTest,
        closeTouchTest,
        
        startAudioTest,
        playAudioChannel,
        finishAudioTest,
        
        startCameraTest,
        switchCamera,
        capturePhoto,
        finishCameraTest,
        
        startSensorsTest,
        finishSensorsTest,
        
        startMicrophoneTest,
        finishMicrophoneTest,

        startSwollenBatteryCheck,
        resetAllTests,
        getReportData: getTestsReportData
    };
})();

// Đăng ký toàn cục các hàm gọi từ inline HTML
window.HardwareTester = HardwareTester;
window.startScreenTest = HardwareTester.startScreenTest;
window.nextScreenColor = HardwareTester.nextScreenColor;
window.closeScreenTest = HardwareTester.closeScreenTest;
window.startTouchTest = HardwareTester.startTouchTest;
window.closeTouchTest = HardwareTester.closeTouchTest;
window.startAudioTest = HardwareTester.startAudioTest;
window.playAudioChannel = HardwareTester.playAudioChannel;
window.finishAudioTest = HardwareTester.finishAudioTest;
window.startCameraTest = HardwareTester.startCameraTest;
window.switchCamera = HardwareTester.switchCamera;
window.capturePhoto = HardwareTester.capturePhoto;
window.finishCameraTest = HardwareTester.finishCameraTest;
window.startSensorsTest = HardwareTester.startSensorsTest;
window.finishSensorsTest = HardwareTester.finishSensorsTest;
window.startMicrophoneTest = HardwareTester.startMicrophoneTest;
window.finishMicrophoneTest = HardwareTester.finishMicrophoneTest;
window.startSwollenBatteryCheck = HardwareTester.startSwollenBatteryCheck;
window.resetAllTests = HardwareTester.resetAllTests;
