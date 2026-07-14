/**
 * Module: battery.js
 * Quản lý chẩn đoán và theo dõi tình trạng Pin (thật + giả lập)
 */

const BatteryMonitor = (() => {
    let batteryInstance = null;
    
    // Các thông số giả lập nếu trình duyệt không hỗ trợ API Battery thực tế
    const mockBattery = {
        level: 0.78, // 78%
        charging: false,
        chargingTime: Infinity,
        dischargingTime: 14400,
        temp: 32.8,
        voltage: 3.92,
        health: "Tốt (96%)",
        status: "Đang xả pin"
    };

    // Khởi tạo theo dõi pin
    async function init() {
        if ('getBattery' in navigator) {
            try {
                batteryInstance = await navigator.getBattery();
                setupEventListeners();
                updateBatteryUI();
            } catch (e) {
                console.warn("Battery API error, switching to mock:", e);
                setupMockBattery();
            }
        } else {
            console.log("Battery Status API not supported, using mock simulation.");
            setupMockBattery();
        }
        
        // Cập nhật nhiệt độ & điện áp định kỳ (mô phỏng sự thay đổi nhỏ)
        setInterval(fluctuateParameters, 5000);
    }

    function setupEventListeners() {
        if (!batteryInstance) return;
        
        batteryInstance.addEventListener('chargingchange', () => {
            updateBatteryUI();
        });
        
        batteryInstance.addEventListener('levelchange', () => {
            updateBatteryUI();
        });
    }

    function setupMockBattery() {
        // Mô phỏng sạc pin khi click vào thẻ Pin trên dashboard để người dùng test được hoạt ảnh
        const batteryCard = document.getElementById('dash-battery-icon-wrapper');
        if (batteryCard) {
            batteryCard.style.cursor = 'pointer';
            batteryCard.addEventListener('click', () => {
                mockBattery.charging = !mockBattery.charging;
                mockBattery.status = mockBattery.charging ? "Đang sạc pin" : "Đang xả pin";
                
                // Hiển thị thông báo nhỏ
                showHapticFeedback();
                updateBatteryUI();
            });
        }
        updateBatteryUI();
    }

    // Mô phỏng sự dao động nhiệt độ và dòng điện của pin
    function fluctuateParameters() {
        let currentTemp = batteryInstance ? 31.2 : mockBattery.temp;
        let isCharging = batteryInstance ? batteryInstance.charging : mockBattery.charging;
        
        // Nhiệt độ tăng khi sạc
        const baseTemp = isCharging ? 36.5 : 31.8;
        const targetTemp = baseTemp + (Math.random() * 1.5 - 0.75);
        
        if (batteryInstance) {
            // Cập nhật giá trị hiển thị giả lập trên UI cho các phần không được cung cấp bởi API thực tế (như Temp, Voltage)
            mockBattery.temp = targetTemp;
            mockBattery.voltage = 3.6 + (batteryInstance.level * 0.6) + (Math.random() * 0.04 - 0.02);
        } else {
            mockBattery.temp = targetTemp;
            mockBattery.voltage = 3.6 + (mockBattery.level * 0.6) + (Math.random() * 0.04 - 0.02);
            
            // Tăng hoặc giảm level pin mô phỏng
            if (mockBattery.charging) {
                mockBattery.level = Math.min(1.0, mockBattery.level + 0.005);
            } else {
                mockBattery.level = Math.max(0.01, mockBattery.level - 0.001);
            }
        }
        
        updateBatteryUI();
    }

    // Cập nhật giao diện Pin
    function updateBatteryUI() {
        let level, charging;
        
        if (batteryInstance) {
            level = batteryInstance.level;
            charging = batteryInstance.charging;
            mockBattery.level = level;
            mockBattery.charging = charging;
            mockBattery.status = charging ? "Đang sạc pin (Nguồn AC)" : "Đang xả pin";
        } else {
            level = mockBattery.level;
            charging = mockBattery.charging;
        }

        const percent = Math.round(level * 100);
        
        // 1. Cập nhật Status Bar & Dashboard
        const headerBattery = document.getElementById('header-battery');
        if (headerBattery) {
            headerBattery.textContent = `${percent}% ${charging ? '⚡🔋' : '🔋'}`;
        }
        
        const dashBatteryLevel = document.getElementById('dash-battery-level');
        if (dashBatteryLevel) {
            dashBatteryLevel.textContent = `${percent}%`;
        }

        // 2. Cập nhật chi tiết trong tab Resources
        const batteryFill = document.getElementById('battery-fill-level');
        const batteryLevelDetail = document.getElementById('battery-level-detail');
        const batteryStatusText = document.getElementById('battery-status');
        const batteryTemp = document.getElementById('battery-temp');
        const batteryVoltage = document.getElementById('battery-voltage');
        const batteryHealth = document.getElementById('battery-health');
        
        if (batteryFill) {
            batteryFill.style.height = `${percent}%`;
            if (charging) {
                batteryFill.classList.add('charging');
            } else {
                batteryFill.classList.remove('charging');
            }
        }
        
        if (batteryLevelDetail) {
            batteryLevelDetail.textContent = `${percent}%`;
        }
        
        if (batteryStatusText) {
            batteryStatusText.textContent = mockBattery.status;
        }
        
        if (batteryTemp) {
            batteryTemp.textContent = `${mockBattery.temp.toFixed(1)} °C`;
        }
        
        if (batteryVoltage) {
            batteryVoltage.textContent = `${mockBattery.voltage.toFixed(2)} V`;
        }

        // Cập nhật Dung lượng & Độ chai Pin (Sử dụng Native Bridge nếu trên APK)
        const batteryCapacity = document.getElementById('battery-capacity');
        const batteryWear = document.getElementById('battery-wear');
        
        let capacityVal = "6000 mAh";
        let wearVal = "96% (Tốt)";

        if (window.AndroidNative) {
            try {
                if (typeof window.AndroidNative.getBatteryCapacity === 'function') {
                    capacityVal = window.AndroidNative.getBatteryCapacity();
                }
                if (typeof window.AndroidNative.getBatteryHealth === 'function') {
                    wearVal = window.AndroidNative.getBatteryHealth();
                }
            } catch (err) {
                console.error("Lỗi khi gọi AndroidNative:", err);
            }
        }

        if (batteryCapacity) batteryCapacity.textContent = capacityVal;
        if (batteryWear) batteryWear.textContent = wearVal;

        // Xác định sức khỏe Pin (Giả lập dựa vào nhiệt độ và mức pin)
        if (batteryHealth) {
            if (mockBattery.temp > 42) {
                batteryHealth.textContent = "Nóng (Cần hạ nhiệt)";
                batteryHealth.style.borderColor = "var(--accent-red)";
                batteryHealth.style.color = "var(--accent-red)";
                batteryHealth.style.backgroundColor = "rgba(255, 59, 48, 0.15)";
            } else if (mockBattery.temp > 38) {
                batteryHealth.textContent = "Ấm (Bình thường)";
                batteryHealth.style.borderColor = "var(--accent-orange)";
                batteryHealth.style.color = "var(--accent-orange)";
                batteryHealth.style.backgroundColor = "rgba(255, 94, 0, 0.15)";
            } else {
                batteryHealth.textContent = "Hoàn hảo (98%)";
                batteryHealth.style.borderColor = "rgba(0, 255, 102, 0.2)";
                batteryHealth.style.color = "var(--accent-green)";
                batteryHealth.style.backgroundColor = "rgba(0, 255, 102, 0.15)";
            }
        }
    }

    // Hiệu ứng phản hồi rung giả lập trên thiết bị di động
    function showHapticFeedback() {
        if ('vibrate' in navigator) {
            navigator.vibrate(60);
        }
    }

    // Lấy thông số pin cho Báo cáo
    function getBatteryReportData() {
        const percent = Math.round(mockBattery.level * 100);
        return {
            level: percent,
            charging: mockBattery.charging,
            temp: mockBattery.temp.toFixed(1),
            voltage: mockBattery.voltage.toFixed(2),
            health: mockBattery.temp > 42 ? "Cảnh báo nóng" : "Tốt"
        };
    }

    return {
        init,
        getReportData: getBatteryReportData
    };
})();

// Xuất ra toàn cục để sử dụng
window.BatteryMonitor = BatteryMonitor;
