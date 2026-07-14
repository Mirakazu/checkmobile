/**
 * Module: diagnostics.js
 * Quản lý tính toán điểm số sức khỏe thiết bị, tổng hợp các khuyến nghị và xuất báo cáo chẩn đoán
 */

const DiagnosticsReport = (() => {

    // Danh sách tên hiển thị tiếng Việt của các bài test
    const testNames = {
        screen: "Màn hình & Điểm chết",
        touch: "Cảm ứng màn hình",
        audio: "Loa & Âm thanh",
        mic: "Microphone",
        sensors: "Cảm biến gia tốc",
        camera: "Máy ảnh (Camera)",
        swollen: "Độ phồng Pin vật lý"
    };

    // Tính toán lại điểm số sức khỏe thiết bị dựa vào kết quả test
    function calculateScore() {
        const results = HardwareTester.getReportData();
        const totalTests = Object.keys(results).length;
        
        let testedCount = 0;
        let passCount = 0;
        let failCount = 0;

        Object.keys(results).forEach(key => {
            if (results[key] !== null) {
                testedCount++;
                if (results[key] === true) passCount++;
                else failCount++;
            }
        });

        // Nếu chưa làm bất cứ bài test nào
        if (testedCount === 0) {
            return {
                score: "--",
                status: "Chưa chẩn đoán",
                desc: "Vui lòng thực hiện các bài kiểm tra phần cứng trong tab 'Chẩn đoán' để bắt đầu đánh giá thiết bị.",
                percentage: 0
            };
        }

        // Cách tính điểm: 
        // Bắt đầu từ 100.
        // Mỗi bài test LỖI (Fail) trừ 15 điểm.
        // Mỗi bài test CHƯA LÀM (Pending) trừ 3 điểm (vì chưa xác nhận tình trạng).
        const pendingCount = totalTests - testedCount;
        let score = 100 - (failCount * 15) - (pendingCount * 3);
        score = Math.max(20, Math.min(100, score));

        // NẾU PIN BỊ PHỒNG, cưỡng ép điểm số xuống mức tối thiểu (20) vì đây là lỗi vật lý cực kỳ nguy hiểm
        if (results.swollen === false) {
            score = 20;
        }

        let statusText = "Hoàn hảo";
        let descText = "Tất cả các bài kiểm tra đã thực hiện đều đạt kết quả xuất sắc. Điện thoại của bạn đang trong tình trạng rất tốt!";

        if (results.swollen === false) {
            statusText = "NGUY HIỂM (Pin phồng)";
            descText = "⚠️ CẢNH BÁO NGUY HIỂM: Phát hiện pin bị phồng gồ lên dưới mặt lưng. Hãy lập tức dừng sạc, hạn chế sử dụng máy và mang đi thay pin ngay để tránh nguy cơ cháy nổ!";
        } else if (score < 60) {
            statusText = "Kém (Cần sửa chữa)";
            descText = "Phát hiện nhiều lỗi phần cứng nghiêm trọng. Đề xuất mang máy đến trung tâm bảo hành gần nhất để kiểm tra.";
        } else if (score < 85) {
            statusText = "Khá (Có lỗi nhẹ)";
            descText = "Hệ thống hoạt động tương đối ổn định nhưng có một vài thành phần lỗi hoặc chưa được chẩn đoán.";
        }

        return {
            score: score,
            status: statusText,
            desc: descText,
            percentage: score
        };
    }

    // Cập nhật tab Báo cáo
    function renderReportTab() {
        const health = calculateScore();
        
        // 1. Hiển thị điểm sức khỏe
        const scoreBadge = document.getElementById('report-health-score-badge');
        if (scoreBadge) {
            scoreBadge.textContent = health.score === "--" ? "--" : `${health.score}%`;
            
            // Thay đổi màu sắc vòng tròn viền dựa trên điểm số
            if (health.score === "--") {
                scoreBadge.style.borderColor = "var(--text-secondary)";
                scoreBadge.style.color = "var(--text-secondary)";
                scoreBadge.style.boxShadow = "none";
            } else if (health.score >= 85) {
                scoreBadge.style.borderColor = "var(--accent-green)";
                scoreBadge.style.color = "var(--accent-green)";
                scoreBadge.style.boxShadow = "0 0 12px rgba(0, 255, 102, 0.3)";
            } else if (health.score >= 60) {
                scoreBadge.style.borderColor = "var(--accent-orange)";
                scoreBadge.style.color = "var(--accent-orange)";
                scoreBadge.style.boxShadow = "0 0 12px rgba(255, 94, 0, 0.3)";
            } else {
                scoreBadge.style.borderColor = "var(--accent-red)";
                scoreBadge.style.color = "var(--accent-red)";
                scoreBadge.style.boxShadow = "0 0 12px rgba(255, 59, 48, 0.3)";
            }
        }

        // Cập nhật timestamp báo cáo
        const timeText = document.getElementById('report-timestamp');
        if (timeText) {
            const now = new Date();
            timeText.textContent = `Thời gian: ${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}`;
        }

        // 2. Điền thông tin máy
        const batteryData = BatteryMonitor.getReportData();
        const resourcesData = ResourcesMonitor.getReportData();
        
        const repOS = document.getElementById('rep-os');
        const repScreen = document.getElementById('rep-screen');
        const repBattery = document.getElementById('rep-battery');
        const repRAM = document.getElementById('rep-ram');

        if (repOS) repOS.textContent = App.getDeviceInfo().os;
        if (repScreen) repScreen.textContent = `${window.screen.width}x${window.screen.height}`;
        if (repBattery) repBattery.textContent = `${batteryData.level}% (${batteryData.charging ? 'Đang sạc' : 'Đang xả'})`;
        if (repRAM) repRAM.textContent = resourcesData.ramTotal;

        // 3. Tạo danh sách kết quả test phần cứng
        const testsContainer = document.getElementById('report-tests-list');
        if (testsContainer) {
            testsContainer.innerHTML = '';
            
            const results = HardwareTester.getReportData();
            let hasTests = false;

            Object.keys(results).forEach(key => {
                const state = results[key];
                if (state !== null) {
                    hasTests = true;
                    const item = document.createElement('div');
                    item.className = 'report-test-item';
                    
                    const statusClass = state ? 'text-green' : 'text-red';
                    const statusIcon = state ? '✓ Đạt' : '✗ Lỗi';
                    
                    item.innerHTML = `
                        <span>${testNames[key]}</span>
                        <strong class="${statusClass}">${statusIcon}</strong>
                    `;
                    testsContainer.appendChild(item);
                }
            });

            if (!hasTests) {
                testsContainer.innerHTML = `<div class="empty-tests-msg">Hãy thực hiện ít nhất một bài kiểm tra ở tab "Chẩn đoán".</div>`;
            }
        }

        // 4. Tạo các lời khuyên / khuyến nghị cải thiện
        generateRecommendations(health.score, batteryData, resourcesData);
    }

    function generateRecommendations(score, battery, resources) {
        const list = document.getElementById('report-recommendations');
        if (!list) return;

        list.innerHTML = '';
        const tips = [];

        const results = HardwareTester.getReportData();

        // Kiểm tra các lỗi phần cứng trước
        if (results.swollen === false) {
            tips.push("⚠️ NGUY HIỂM: Pin máy của bạn bị phồng gồ lên. Hãy lập tức ngắt sạc, tắt nguồn/hạn chế sử dụng và đem máy đi thay pin sớm để tránh cháy nổ!");
        }
        if (results.screen === false) {
            tips.push("Màn hình phát hiện lỗi màu hoặc điểm chết. Tránh để màn hình ở độ sáng tối đa quá lâu để giảm thiểu loang mực.");
        }
        if (results.touch === false) {
            tips.push("Phát hiện vùng liệt cảm ứng. Đề xuất tháo miếng dán cường lực cũ ra kiểm tra lại hoặc thay thế kính cảm ứng.");
        }
        if (results.audio === false) {
            tips.push("Âm thanh loa có vấn đề. Kiểm tra màng loa xem có bị bám bụi bẩn, nước hay xơ vải không.");
        }
        if (results.mic === false) {
            tips.push("Microphone thu âm kém hoặc ồn. Vệ sinh lỗ mic nhỏ ở cạnh dưới điện thoại.");
        }
        if (results.camera === false) {
            tips.push("Camera không phản hồi tốt. Hãy thử lau sạch ống kính máy ảnh bằng khăn mềm sạch.");
        }

        // Các lỗi tài nguyên hệ thống
        if (resources.ramUsedPercent > 80) {
            tips.push("RAM đang quá tải. Hãy tắt bớt các ứng dụng chạy ngầm và tab trình duyệt để giải phóng bộ nhớ.");
        }
        
        if (parseFloat(battery.temp) > 39) {
            tips.push("Nhiệt độ Pin rất cao. Tránh chơi game nặng hoặc vừa sạc vừa dùng lúc này.");
        }

        if (battery.level < 20 && !battery.charging) {
            tips.push("Mức pin đang thấp dưới 20%. Vui lòng kích hoạt chế độ tiết kiệm pin hoặc kết nối bộ sạc.");
        }

        // Mẹo mặc định
        tips.push("Nên khởi động lại điện thoại định kỳ 1 lần/tuần để xóa bộ nhớ đệm và cải thiện tốc độ xử lý.");
        tips.push("Cập nhật trình duyệt và hệ điều hành lên phiên bản mới nhất để vá các lỗi bảo mật phần cứng.");

        // Hiển thị tối đa 4 mẹo quan trọng nhất
        tips.slice(0, 4).forEach(tip => {
            const li = document.createElement('li');
            li.textContent = tip;
            list.appendChild(li);
        });
    }

    // Xuất báo cáo dạng in / PDF gọn đẹp (mở cửa sổ in chuyên biệt)
    function exportReport() {
        const results = HardwareTester.getReportData();
        const health = calculateScore();
        const battery = BatteryMonitor.getReportData();
        const resources = ResourcesMonitor.getReportData();
        const info = App.getDeviceInfo();

        const testedItems = Object.keys(results).map(key => {
            const statusText = results[key] === null ? "Chưa kiểm tra" : (results[key] ? "ĐẠT (PASS)" : "LỖI (FAIL)");
            return `<tr><td>${testNames[key]}</td><td>${statusText}</td></tr>`;
        }).join('');

        const recommendations = Array.from(document.querySelectorAll('#report-recommendations li'))
            .map(li => `<li>${li.textContent}</li>`).join('');

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>DeviceCare Pro - Diagnostic Report</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; padding: 30px; line-height: 1.6; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .title h1 { margin: 0; color: #1a1e2e; font-size: 24px; }
                    .title p { margin: 5px 0 0 0; color: #666; font-size: 12px; }
                    .score-badge { border: 3px solid #00f0ff; border-radius: 50%; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: bold; }
                    .section { margin-top: 30px; }
                    .section h3 { border-left: 4px solid #bd00ff; padding-left: 10px; margin-bottom: 15px; color: #1a1e2e; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                    th { background-color: #f5f5f7; }
                    ul { padding-left: 20px; }
                    li { margin-bottom: 8px; }
                    @media print {
                        body { padding: 0; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">
                        <h1>BÁO CÁO CHẨN ĐOÁN THIẾT BỊ</h1>
                        <p>Ứng dụng tạo lập: DeviceCare Pro | Ngày tạo: ${new Date().toLocaleString('vi-VN')}</p>
                    </div>
                    <div class="score-badge" style="border-color: ${health.score >= 85 ? '#00ff66' : (health.score >= 60 ? '#ff5e00' : '#ff3b30')}">
                        ${health.score === '--' ? '--' : health.score + '%'}
                    </div>
                </div>

                <div class="section">
                    <h3>Thông tin máy</h3>
                    <table>
                        <tr><td><b>Thiết bị:</b></td><td>${info.name}</td><td><b>Hệ điều hành:</b></td><td>${info.os}</td></tr>
                        <tr><td><b>Màn hình chính:</b></td><td>${window.screen.width}x${window.screen.height}</td><td><b>Tổng RAM:</b></td><td>${resources.ramTotal}</td></tr>
                        <tr><td><b>Thông số Pin:</b></td><td>${battery.level}% (${battery.charging ? 'Đang sạc' : 'Đang xả'}, ${battery.temp}°C)</td><td><b>Mạng kết nối:</b></td><td>${battery.online ? 'Online' : 'Offline'} (${resources.cpuCores} Cores)</td></tr>
                    </table>
                </div>

                <div class="section">
                    <h3>Kết quả kiểm tra chi tiết</h3>
                    <table>
                        <thead>
                            <tr><th>Bộ phận kiểm tra</th><th>Kết quả đánh giá</th></tr>
                        </thead>
                        <tbody>
                            ${testedItems}
                        </tbody>
                    </table>
                </div>

                <div class="section">
                    <h3>Khuyến nghị hệ thống</h3>
                    <ul>
                        ${recommendations || '<li>Không có khuyến nghị nào thêm. Thiết bị hoạt động tốt.</li>'}
                    </ul>
                </div>

                <div style="margin-top: 40px; text-align: center;">
                    <button onclick="window.print()" style="padding: 10px 24px; font-weight: bold; background-color: #1a1e2e; color: white; border: none; border-radius: 6px; cursor: pointer;">In báo cáo này</button>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    // Chia sẻ tóm tắt kết quả báo cáo chẩn đoán
    function shareReport() {
        const health = calculateScore();
        const info = App.getDeviceInfo();
        const shareText = `DeviceCare Pro: Sức khỏe điện thoại của tôi đạt ${health.score}% (${health.status}). Hệ điều hành: ${info.os}. Hãy kiểm tra thiết bị của bạn ngay!`;

        if (navigator.share) {
            navigator.share({
                title: 'Báo cáo Sức khỏe Điện thoại',
                text: shareText,
                url: window.location.href
            }).catch(console.error);
        } else {
            // Fallback: sao chép vào bộ nhớ đệm
            navigator.clipboard.writeText(shareText).then(() => {
                alert("Đã sao chép tóm tắt báo cáo vào Clipboard để chia sẻ:\n\n" + shareText);
            }).catch(() => {
                alert(shareText);
            });
        }
    }

    return {
        calculateScore,
        renderReportTab,
        exportReport,
        shareReport
    };
})();

// Đăng ký toàn cục
window.DiagnosticsReport = DiagnosticsReport;
window.exportReport = DiagnosticsReport.exportReport;
window.shareReport = DiagnosticsReport.shareReport;
