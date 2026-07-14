/**
 * Module: app.js
 * Quản lý vòng đời ứng dụng, định tuyến tab, phân tích thông tin thiết bị và đồng bộ hóa giao diện
 */

const App = (() => {
    let appStartTime = Date.now();
    const deviceInfo = {
        name: "Thiết bị mô phỏng",
        os: "Đang xác định...",
        browser: "Đang xác định..."
    };

    // Khởi chạy ứng dụng
    function init() {
        // 1. Phân tích thiết bị
        parseDeviceInfo();

        // 2. Chạy bộ đếm giờ (Status bar + Uptime)
        startClockAndUptime();

        // 3. Khởi tạo các module con
        if (window.BatteryMonitor) BatteryMonitor.init();
        if (window.ResourcesMonitor) ResourcesMonitor.init();
        if (window.NetworkMonitor) NetworkMonitor.init();

        // 4. Nhấp nút tải lại thông tin hệ thống trên Dashboard
        const btnRefreshSys = document.getElementById('btn-refresh-sys');
        if (btnRefreshSys) {
            btnRefreshSys.addEventListener('click', () => {
                parseDeviceInfo();
                // Hiệu ứng xoay tròn nút refresh
                btnRefreshSys.style.transform = 'rotate(360deg)';
                btnRefreshSys.style.transition = 'transform 0.5s ease';
                setTimeout(() => {
                    btnRefreshSys.style.transform = 'rotate(0deg)';
                    btnRefreshSys.style.transition = 'none';
                }, 500);
                
                if ('vibrate' in navigator) navigator.vibrate(50);
            });
        }

        // 5. Đăng ký nút đo lại mạng
        const btnSpeed = document.getElementById('btn-start-speedtest');
        if (btnSpeed) {
            btnSpeed.disabled = false;
        }

        // 6. Tính toán điểm sức khỏe ban đầu
        recalculateHealthScore();
    }

    // Đổi tab hiển thị
    function switchTab(tabId) {
        // Rung phản hồi nhẹ
        if ('vibrate' in navigator) navigator.vibrate(30);

        // 1. Ẩn tất cả các tab
        const tabs = document.querySelectorAll('.tab-view');
        tabs.forEach(t => t.classList.remove('active'));

        // 2. Bỏ trạng thái active trên các nút menu
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));

        // 3. Hiển thị tab mục tiêu
        const targetTab = document.getElementById(`tab-${tabId}`);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        // 4. Thiết lập nút menu active tương ứng
        // Tìm nút dựa trên tham số hàm click
        const navBtn = Array.from(navItems).find(btn => {
            const clickAttr = btn.getAttribute('onclick');
            return clickAttr && clickAttr.includes(`'${tabId}'`);
        });
        if (navBtn) {
            navBtn.classList.add('active');
        }

        // Cuộn tab lên đầu trang
        const contentArea = document.getElementById('main-content');
        if (contentArea) contentArea.scrollTop = 0;

        // 5. Nếu chuyển qua tab báo cáo -> cập nhật dữ liệu báo cáo động
        if (tabId === 'report') {
            if (window.DiagnosticsReport) {
                window.DiagnosticsReport.renderReportTab();
            }
        }
    }

    // Phân tích UserAgent để lấy thông tin hệ thống chính xác
    function parseDeviceInfo() {
        const ua = navigator.userAgent;
        let osName = "Hệ điều hành khác";
        let deviceName = "Thiết bị di động";

        // Phân tích Hệ điều hành
        if (/iPhone|iPad|iPod/.test(ua)) {
            osName = "iOS";
            deviceName = /iPad/.test(ua) ? "Apple iPad" : "Apple iPhone";
        } else if (/Android/.test(ua)) {
            osName = "Android OS";
            
            // Cố gắng trích xuất model máy từ UA Android
            const match = ua.match(/Android\s+([^\s;]+);\s+([^;)]+)\s+Build/);
            if (match && match[2]) {
                deviceName = match[2].trim();
            } else {
                deviceName = "Điện thoại Android";
            }
        } else if (/Windows/.test(ua)) {
            osName = "Windows OS";
            deviceName = "Windows PC (Mô phỏng)";
        } else if (/Macintosh/.test(ua)) {
            osName = "macOS";
            deviceName = "Apple Mac (Mô phỏng)";
        } else if (/Linux/.test(ua)) {
            osName = "Linux OS";
            deviceName = "Linux Desktop (Mô phỏng)";
        }

        // Phân tích trình duyệt
        let browserName = "Trình duyệt khác";
        if (/Chrome/.test(ua) && /Google Inc/.test(navigator.vendor)) {
            browserName = "Google Chrome";
        } else if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
            browserName = "Apple Safari";
        } else if (/Firefox/.test(ua)) {
            browserName = "Mozilla Firefox";
        } else if (/Edg/.test(ua)) {
            browserName = "Microsoft Edge";
        }

        deviceInfo.name = deviceName;
        deviceInfo.os = osName;
        deviceInfo.browser = browserName;

        // Cập nhật lên giao diện
        const badge = document.getElementById('device-model-badge');
        if (badge) {
            badge.textContent = deviceName.length > 15 ? deviceName.substring(0, 15) + '...' : deviceName;
        }

        const sysName = document.getElementById('sys-name');
        const sysOS = document.getElementById('sys-os');
        const sysBrowser = document.getElementById('sys-browser');
        const sysScreen = document.getElementById('sys-screen');

        if (sysName) sysName.textContent = deviceName;
        if (sysOS) sysOS.textContent = osName;
        if (sysBrowser) sysBrowser.textContent = browserName;
        if (sysScreen) sysScreen.textContent = `${window.screen.width} x ${window.screen.height}`;
    }

    // Bộ đếm thời gian
    function startClockAndUptime() {
        // Cập nhật đồng hồ status bar mỗi giây
        setInterval(() => {
            const timeEl = document.getElementById('current-time');
            if (timeEl) {
                const now = new Date();
                const hh = String(now.getHours()).padStart(2, '0');
                const mm = String(now.getMinutes()).padStart(2, '0');
                timeEl.textContent = `${hh}:${mm}`;
            }

            // Uptime đếm tiến trình
            const uptimeEl = document.getElementById('sys-uptime');
            if (uptimeEl) {
                const diffMs = Date.now() - appStartTime;
                const totalSec = Math.floor(diffMs / 1000);
                
                const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
                const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
                const secs = String(totalSec % 60).padStart(2, '0');
                
                uptimeEl.textContent = `${hrs}:${mins}:${secs}`;
            }
        }, 1000);
    }

    // Tính toán lại điểm sức khỏe và vẽ vòng gauge Dashboard
    function recalculateHealthScore() {
        if (!window.DiagnosticsReport) return;

        const health = window.DiagnosticsReport.calculateScore();
        
        // Cập nhật text số liệu và nhãn tình trạng
        const scoreText = document.getElementById('health-score');
        const statusText = document.getElementById('health-status-text');
        const statusDesc = document.getElementById('health-status-desc');

        if (scoreText) scoreText.textContent = health.score;
        if (statusText) statusText.textContent = health.status;
        if (statusDesc) statusDesc.textContent = health.desc;

        // Vẽ cung tròn SVG tiến trình (Chu vi stroke cx=50, cy=50, r=45 là 2 * PI * 45 ≈ 282.7 -> 283)
        const progressCircle = document.getElementById('health-progress');
        if (progressCircle) {
            const circumference = 283;
            
            if (health.score === "--") {
                progressCircle.style.strokeDashoffset = circumference;
                progressCircle.style.stroke = "var(--text-secondary)";
            } else {
                const offset = circumference - (health.percentage / 100) * circumference;
                progressCircle.style.strokeDashoffset = offset;
                
                // Thay đổi màu sắc vòng theo điểm số
                if (health.score >= 85) {
                    progressCircle.style.stroke = "var(--accent-green)";
                    progressCircle.style.filter = "drop-shadow(0 0 6px rgba(0, 255, 102, 0.5))";
                } else if (health.score >= 60) {
                    progressCircle.style.stroke = "var(--accent-orange)";
                    progressCircle.style.filter = "drop-shadow(0 0 6px rgba(255, 94, 0, 0.5))";
                } else {
                    progressCircle.style.stroke = "var(--accent-red)";
                    progressCircle.style.filter = "drop-shadow(0 0 6px rgba(255, 59, 48, 0.5))";
                }
            }
        }
    }

    function getDeviceInfo() {
        return deviceInfo;
    }

    return {
        init,
        switchTab,
        recalculateHealthScore,
        getDeviceInfo
    };
})();

// Khởi tạo ngay khi trang tải xong
document.addEventListener('DOMContentLoaded', App.init);

// Đăng ký toàn cục
window.App = App;
window.switchTab = App.switchTab;
