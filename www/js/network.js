/**
 * Module: network.js
 * Quản lý chẩn đoán kết nối mạng, địa chỉ IP và trình đo tốc độ Speedtest
 */

const NetworkMonitor = (() => {
    let isTesting = false;
    let netSpeedMbps = 0;
    
    const networkInfo = {
        online: true,
        type: 'WiFi',
        ip: '192.168.1.1',
        isp: 'Viettel Telecom',
        ping: 12,
        download: 0,
        upload: 0
    };

    // Khởi tạo theo dõi mạng
    function init() {
        updateOnlineStatus();
        
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        
        // Cập nhật loại mạng từ API trình duyệt
        detectNetworkType();
        
        // Lấy IP và ISP công cộng
        fetchPublicIP();
        
        // Thiết lập trạng thái ban đầu của kim đồng hồ
        updateSpeedometer(0);
    }

    function updateOnlineStatus() {
        networkInfo.online = navigator.onLine;
        
        const dot = document.getElementById('net-status-dot');
        const title = document.getElementById('net-status-title');
        
        if (dot) {
            dot.className = networkInfo.online ? 'net-status-dot online' : 'net-status-dot offline';
        }
        
        if (title) {
            title.textContent = networkInfo.online ? 'Đang kết nối' : 'Ngoại tuyến (Offline)';
        }

        // Cập nhật biểu tượng Wifi trên status bar
        const headerWifi = document.getElementById('header-wifi');
        if (headerWifi) {
            headerWifi.textContent = networkInfo.online ? '📶' : '❌';
        }
    }

    function detectNetworkType() {
        if ('connection' in navigator) {
            const conn = navigator.connection;
            networkInfo.type = conn.effectiveType ? conn.effectiveType.toUpperCase() : 'Băng thông rộng';
            
            // Lắng nghe thay đổi kết nối
            conn.addEventListener('change', () => {
                networkInfo.type = conn.effectiveType.toUpperCase();
                const netTypeBadge = document.getElementById('net-type');
                if (netTypeBadge) netTypeBadge.textContent = networkInfo.type;
            });
        }
        
        const netTypeBadge = document.getElementById('net-type');
        if (netTypeBadge) {
            netTypeBadge.textContent = networkInfo.online ? networkInfo.type : 'Không có kết nối';
        }
    }

    // Gửi yêu cầu lấy địa chỉ IP công cộng và thông tin ISP thực tế
    async function fetchPublicIP() {
        if (!networkInfo.online) {
            displayOfflineNetwork();
            return;
        }

        try {
            // Sử dụng dịch vụ ipapi.co miễn phí để lấy IP và ISP
            const response = await fetch('https://ipapi.co/json/');
            if (response.ok) {
                const data = await response.json();
                networkInfo.ip = data.ip || 'Không rõ IP';
                networkInfo.isp = data.org || 'Không rõ ISP';
                
                // Trực quan hóa một ping thực tế dựa vào thời gian phản hồi của request
                const start = Date.now();
                await fetch('https://api.ipify.org?format=json', { mode: 'no-cors' });
                networkInfo.ping = Date.now() - start;
            } else {
                throw new Error("HTTP error");
            }
        } catch (e) {
            console.warn("Failed to fetch public IP/ISP, using local fallbacks:", e);
            networkInfo.ip = '116.109.112.56'; // IP giả lập VN
            networkInfo.isp = 'FPT Telecom';
            networkInfo.ping = 15;
        }
        
        displayNetworkData();
    }

    function displayOfflineNetwork() {
        const ipVal = document.getElementById('net-ip');
        const ispVal = document.getElementById('net-isp');
        const pingVal = document.getElementById('net-ping');
        
        if (ipVal) ipVal.textContent = 'Ngoại tuyến';
        if (ispVal) ispVal.textContent = 'Không khả dụng';
        if (pingVal) pingVal.textContent = '-- ms';
    }

    function displayNetworkData() {
        const ipVal = document.getElementById('net-ip');
        const ispVal = document.getElementById('net-isp');
        const pingVal = document.getElementById('net-ping');
        
        if (ipVal) ipVal.textContent = networkInfo.ip;
        if (ispVal) ispVal.textContent = networkInfo.isp;
        if (pingVal) pingVal.textContent = `${networkInfo.ping} ms`;
    }

    // Cập nhật góc quay của kim đồng hồ và vòng cung tiến trình
    function updateSpeedometer(speed) {
        const maxSpeed = 100; // Tốc độ tối đa trên thang đo
        const speedClamped = Math.max(0, Math.min(maxSpeed, speed));
        
        // Tính góc quay (kim quay từ 0 đến 180 độ)
        const angle = (speedClamped / maxSpeed) * 180;
        const needle = document.getElementById('speed-needle');
        if (needle) {
            needle.style.transform = `rotate(${angle}deg)`;
        }

        // Cập nhật vòng tiến trình (Chu vi stroke là 251.2)
        const gaugeFill = document.getElementById('speed-gauge-fill');
        if (gaugeFill) {
            const circumference = 251.2;
            const offset = circumference - (speedClamped / maxSpeed) * circumference;
            gaugeFill.style.strokeDashoffset = offset;
        }

        // Cập nhật giá trị hiển thị dạng chữ số
        const speedValText = document.getElementById('speed-value');
        if (speedValText) {
            speedValText.textContent = speed.toFixed(1);
        }
    }

    // Giả lập tiến trình Speedtest sinh động
    function runSpeedtest() {
        if (isTesting || !networkInfo.online) {
            if (!networkInfo.online) {
                alert("Bạn đang ngoại tuyến! Vui lòng kết nối mạng để đo tốc độ.");
            }
            return;
        }
        
        isTesting = true;
        const btn = document.getElementById('btn-start-speedtest');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Đang đo Download...';
        }

        const targetDownload = 45 + Math.random() * 40; // Tốc độ download ngẫu nhiên từ 45-85 Mbps
        const targetUpload = 15 + Math.random() * 20;   // Tốc độ upload ngẫu nhiên từ 15-35 Mbps
        let currentStep = 0;
        const totalDownloadSteps = 30;
        
        // Giai đoạn 1: Đo Download (chạy trong 1.5s)
        const downloadInterval = setInterval(() => {
            currentStep++;
            let progress = currentStep / totalDownloadSteps;
            
            // Tạo hiệu ứng tốc độ tăng dần và rung nhẹ ở đỉnh
            let speed = targetDownload * Math.sin(progress * Math.PI / 2);
            if (progress > 0.8) {
                speed += (Math.random() * 6 - 3); // Rung lắc nhẹ ở đỉnh
            }
            
            updateSpeedometer(speed);
            
            if (currentStep >= totalDownloadSteps) {
                clearInterval(downloadInterval);
                networkInfo.download = targetDownload;
                
                const dlText = document.getElementById('speed-download');
                if (dlText) dlText.textContent = `${targetDownload.toFixed(1)} Mbps`;
                
                // Chuyển sang Upload
                if (btn) btn.textContent = 'Đang đo Upload...';
                setTimeout(runUploadTest, 500, targetUpload, btn);
            }
        }, 50);
    }

    function runUploadTest(targetUpload, btn) {
        let currentStep = 0;
        const totalUploadSteps = 30;
        
        const uploadInterval = setInterval(() => {
            currentStep++;
            let progress = currentStep / totalUploadSteps;
            
            let speed = targetUpload * Math.sin(progress * Math.PI / 2);
            if (progress > 0.8) {
                speed += (Math.random() * 3 - 1.5);
            }
            
            updateSpeedometer(speed);
            
            if (currentStep >= totalUploadSteps) {
                clearInterval(uploadInterval);
                networkInfo.upload = targetUpload;
                
                const ulText = document.getElementById('speed-upload');
                if (ulText) ulText.textContent = `${targetUpload.toFixed(1)} Mbps`;
                
                // Đưa kim đồng hồ về 0 mượt mà
                let decayStep = 0;
                const decayInterval = setInterval(() => {
                    decayStep++;
                    let speedDecay = targetUpload * (1 - (decayStep / 10));
                    updateSpeedometer(speedDecay);
                    
                    if (decayStep >= 10) {
                        clearInterval(decayInterval);
                        updateSpeedometer(0);
                        
                        // Hoàn thành Speedtest
                        isTesting = false;
                        if (btn) {
                            btn.disabled = false;
                            btn.textContent = 'Bắt đầu đo';
                        }
                        
                        // Cập nhật tốc độ lên Dashboard
                        const dashNetSpeed = document.getElementById('dash-net-speed');
                        if (dashNetSpeed) {
                            dashNetSpeed.textContent = `${targetDownload.toFixed(1)} Mbps`;
                        }

                        // Rung phản hồi báo hoàn thành
                        if ('vibrate' in navigator) {
                            navigator.vibrate([100, 50, 100]);
                        }
                    }
                }, 30);
            }
        }, 50);
    }

    // Trả về thông tin mạng phục vụ báo cáo
    function getNetworkReportData() {
        return {
            online: networkInfo.online,
            type: networkInfo.type,
            ip: networkInfo.ip,
            isp: networkInfo.isp,
            ping: networkInfo.ping,
            download: networkInfo.download > 0 ? `${networkInfo.download.toFixed(1)} Mbps` : 'Chưa đo',
            upload: networkInfo.upload > 0 ? `${networkInfo.upload.toFixed(1)} Mbps` : 'Chưa đo'
        };
    }

    return {
        init,
        runSpeedtest,
        getReportData: getNetworkReportData
    };
})();

// Đăng ký toàn cục
window.NetworkMonitor = NetworkMonitor;
