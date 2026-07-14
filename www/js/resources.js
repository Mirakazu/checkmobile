/**
 * Module: resources.js
 * Quản lý theo dõi hiệu năng CPU, RAM và dung lượng lưu trữ (Storage)
 */

const ResourcesMonitor = (() => {
    let cpuCoresCount = 8;
    let cpuInterval = null;
    let currentBaseLoad = 25; // Base load CPU
    let ramTotalGB = 8;
    let ramUsedPercent = 68;

    // Khởi tạo các tài nguyên
    function init() {
        // Lấy số nhân CPU thực tế từ trình duyệt nếu có
        if (navigator.hardwareConcurrency) {
            cpuCoresCount = navigator.hardwareConcurrency;
        }
        
        // Lấy dung lượng RAM từ trình duyệt nếu có (trả về GB, ví dụ: 4, 8)
        if (navigator.deviceMemory) {
            ramTotalGB = navigator.deviceMemory;
        }

        // Tạo giao diện các nhân CPU
        generateCpuCoresUI();
        
        // Cập nhật thông số ROM lưu trữ
        updateStorageUI();

        // Bắt đầu cập nhật thời gian thực
        startMonitoring();
    }

    // Tạo HTML cho các core CPU
    function generateCpuCoresUI() {
        const coresContainer = document.getElementById('cpu-cores');
        if (!coresContainer) return;

        coresContainer.innerHTML = '';
        for (let i = 0; i < cpuCoresCount; i++) {
            const coreRow = document.createElement('div');
            coreRow.className = 'cpu-core-row';
            coreRow.innerHTML = `
                <span class="core-label">Core ${i + 1}</span>
                <div class="core-progress-bar">
                    <div class="core-progress-fill" id="cpu-core-fill-${i}"></div>
                </div>
                <span class="core-value" id="cpu-core-val-${i}">0%</span>
            `;
            coresContainer.appendChild(coreRow);
        }
    }

    // Đọc và cập nhật thông số ROM Bộ nhớ trong từ Native Android
    function updateStorageUI() {
        let storage = {
            total: 128.0,
            free: 25.4,
            used: 102.6,
            officialTotal: 128.0
        };

        // Đọc qua Native Bridge nếu chạy trên APK
        if (window.AndroidNative && typeof window.AndroidNative.getStorageInfo === 'function') {
            try {
                const infoStr = window.AndroidNative.getStorageInfo();
                storage = JSON.parse(infoStr);
            } catch (err) {
                console.error("Lỗi khi đọc Storage từ AndroidNative:", err);
            }
        }

        // Cập nhật text số liệu
        const usedGBEl = document.getElementById('storage-used-gb');
        const totalGBEl = document.getElementById('storage-total-gb');
        const freeGBEl = document.getElementById('storage-free-gb');

        if (usedGBEl) usedGBEl.textContent = `${storage.used.toFixed(1)} GB`;
        if (totalGBEl) totalGBEl.textContent = `${storage.officialTotal.toFixed(0)} GB`;
        if (freeGBEl) freeGBEl.textContent = `${storage.free.toFixed(1)} GB`;

        // Tính tỷ lệ % phần trăm
        const freePercent = (storage.free / storage.officialTotal) * 100;
        const usedPercent = 100 - freePercent;

        // Phân chia tỷ lệ giả lập của phần đã dùng: Media 45%, Apps 35%, OS còn lại
        const mediaPercent = usedPercent * 0.45;
        const appsPercent = usedPercent * 0.35;
        const systemPercent = usedPercent - mediaPercent - appsPercent;

        // Cập nhật độ rộng các thanh progress
        const segMedia = document.getElementById('storage-seg-media');
        const segApps = document.getElementById('storage-seg-apps');
        const segSystem = document.getElementById('storage-seg-system');
        const segFree = document.getElementById('storage-seg-free');

        if (segMedia) segMedia.style.width = `${mediaPercent}%`;
        if (segApps) segApps.style.width = `${appsPercent}%`;
        if (segSystem) segSystem.style.width = `${systemPercent}%`;
        if (segFree) segFree.style.width = `${freePercent}%`;

        // Cập nhật text Legend
        const lblMedia = document.getElementById('lbl-storage-media');
        const lblApps = document.getElementById('lbl-storage-apps');
        const lblSystem = document.getElementById('lbl-storage-system');
        const lblFree = document.getElementById('lbl-storage-free');

        const mediaGB = (storage.used * 0.45).toFixed(1);
        const appsGB = (storage.used * 0.35).toFixed(1);
        const systemGB = (storage.used - parseFloat(mediaGB) - parseFloat(appsGB)).toFixed(1);

        if (lblMedia) lblMedia.textContent = `Media: ${mediaGB} GB`;
        if (lblApps) lblApps.textContent = `Apps: ${appsGB} GB`;
        if (lblSystem) lblSystem.textContent = `Hệ thống: ${systemGB} GB`;
        if (lblFree) lblFree.textContent = `Trống: ${storage.free.toFixed(1)} GB`;
    }

    // Vòng lặp cập nhật CPU và RAM liên tục
    function startMonitoring() {
        if (cpuInterval) clearInterval(cpuInterval);

        cpuInterval = setInterval(() => {
            // 1. Dao động CPU
            // Thay đổi base load chậm rãi
            currentBaseLoad += (Math.random() * 10 - 5);
            currentBaseLoad = Math.max(10, Math.min(85, currentBaseLoad));

            let totalLoadSum = 0;

            for (let i = 0; i < cpuCoresCount; i++) {
                // Tải của từng nhân độc lập xung quanh base load
                let coreLoad = currentBaseLoad + (Math.random() * 20 - 10);
                coreLoad = Math.max(2, Math.min(100, Math.round(coreLoad)));
                totalLoadSum += coreLoad;

                const fill = document.getElementById(`cpu-core-fill-${i}`);
                const text = document.getElementById(`cpu-core-val-${i}`);

                if (fill) fill.style.width = `${coreLoad}%`;
                if (text) text.textContent = `${coreLoad}%`;
            }

            const averageLoad = Math.round(totalLoadSum / cpuCoresCount);
            
            // Cập nhật nhãn Tải CPU tổng
            const totalLoadBadge = document.getElementById('cpu-total-load');
            if (totalLoadBadge) {
                totalLoadBadge.textContent = `Tải: ${averageLoad}%`;
            }

            // Nhiệt độ CPU tỉ lệ thuận với tải CPU
            const cpuTemp = 36.5 + (averageLoad * 0.4) + (Math.random() * 1.5 - 0.75);
            const dashCpuTemp = document.getElementById('dash-cpu-temp');
            if (dashCpuTemp) {
                dashCpuTemp.textContent = `${cpuTemp.toFixed(1)}°C`;
            }

            // 2. Dao động RAM
            // RAM biến động cực nhỏ
            ramUsedPercent += (Math.random() * 0.4 - 0.2);
            ramUsedPercent = Math.max(40, Math.min(95, ramUsedPercent));
            updateRamUI();

        }, 1500);
    }

    // Cập nhật UI của RAM
    function updateRamUI() {
        const percent = Math.round(ramUsedPercent);
        
        // Update Dashboard
        const dashRamUsage = document.getElementById('dash-ram-usage');
        if (dashRamUsage) {
            dashRamUsage.textContent = `${percent}%`;
        }

        // Update Resource View
        const ramPercentText = document.getElementById('ram-percent');
        const ramProgressCircle = document.getElementById('ram-progress');
        const ramUsedText = document.getElementById('ram-used');
        const ramFreeText = document.getElementById('ram-free');
        const ramTotalText = document.getElementById('ram-total');

        if (ramPercentText) {
            ramPercentText.textContent = `${percent}%`;
        }

        if (ramProgressCircle) {
            // Chu vi hình tròn r=40 là 2 * PI * 40 ≈ 251.2
            const circumference = 251.2;
            const offset = circumference - (percent / 100) * circumference;
            ramProgressCircle.style.strokeDashoffset = offset;
        }

        const usedGB = (ramTotalGB * (percent / 100)).toFixed(2);
        const freeGB = (ramTotalGB - parseFloat(usedGB)).toFixed(2);

        if (ramUsedText) ramUsedText.textContent = `${usedGB} GB`;
        if (ramFreeText) ramFreeText.textContent = `${freeGB} GB`;
        if (ramTotalText) ramTotalText.textContent = `${ramTotalGB.toFixed(1)} GB`;

        // Quản lý thông báo cảnh báo bộ nhớ trên dashboard
        const warningAlert = document.getElementById('dashboard-alert');
        const warningText = document.getElementById('dashboard-alert-text');
        
        if (warningAlert) {
            if (percent >= 85) {
                warningAlert.classList.remove('hide');
                if (warningText) {
                    warningText.textContent = `Bộ nhớ RAM đang sử dụng ở mức rất cao (${percent}%). Hãy đóng các tab trình duyệt không cần thiết.`;
                }
            } else {
                warningAlert.classList.add('hide');
            }
        }
    }

    // Trả về thông tin phục vụ xuất báo cáo
    function getResourcesReportData() {
        const usedGB = (ramTotalGB * (ramUsedPercent / 100)).toFixed(1);
        return {
            ramTotal: `${ramTotalGB} GB`,
            ramUsedPercent: Math.round(ramUsedPercent),
            ramUsedGB: `${usedGB} GB`,
            cpuCores: cpuCoresCount,
            cpuAvgLoad: Math.round(currentBaseLoad)
        };
    }

    return {
        init,
        getReportData: getResourcesReportData
    };
})();

// Đăng ký toàn cục
window.ResourcesMonitor = ResourcesMonitor;
