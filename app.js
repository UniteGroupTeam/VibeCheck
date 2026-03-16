/**
 * VibeCheck - Premium Engine
 * Version: 2.0 (Google UX Optimized)
 */

class VibeEngine {
    constructor() {
        this.active = false;
        this.ctx = null;
        this.analyser = null;
        this.stream = null;
        this.animationId = null;
        this.dbThreshold = 85;
        this.sosActive = false;
        this.sosTimer = 10;
        this.sosInterval = null;

        // DOM Elements
        this.canvas = document.getElementById('vibe-canvas');
        this.mainBtn = document.getElementById('main-action');
        this.dbDisplay = document.getElementById('db-value');
        this.peakDisplay = document.getElementById('peak-value');
        this.statusBadge = document.getElementById('status-badge');
        this.sosOverlay = document.getElementById('emergency-overlay');
        this.sosTimeDisplay = document.getElementById('sos-timer');
        this.cancelSosBtn = document.getElementById('cancel-sos');
        this.settingsBtn = document.getElementById('settings-btn');
        this.settingsPanel = document.getElementById('settings-panel');
        this.closePanelBtn = document.getElementById('close-panel');
        this.sensitivitySlider = document.getElementById('sensitivity-slider');

        this.init();
    }

    init() {
        this.setupCanvas();
        window.addEventListener('resize', () => this.setupCanvas());

        // Event Listeners
        this.mainBtn.addEventListener('click', () => this.toggleEngine());
        this.cancelSosBtn.addEventListener('click', () => this.abortSOS());
        this.settingsBtn.addEventListener('click', () => this.settingsPanel.classList.add('open'));
        this.closePanelBtn.addEventListener('click', () => this.settingsPanel.classList.remove('open'));
        
        this.sensitivitySlider.addEventListener('input', (e) => {
            this.dbThreshold = parseInt(e.target.value);
        });

        document.getElementById('contacts-action').addEventListener('click', () => {
             alert("Añade contactos seguros en la versión Pro (Lanzamiento próximamente).");
        });
    }

    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(dpr, dpr);
    }

    async toggleEngine() {
        if (this.active) {
            this.stopEngine();
        } else {
            await this.startEngine();
        }
    }

    async startEngine() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioCtx.createMediaStreamSource(this.stream);
            this.analyser = audioCtx.createAnalyser();
            this.analyser.fftSize = 512;
            source.connect(this.analyser);

            this.active = true;
            this.updateUI(true);
            this.render();
        } catch (err) {
            alert("VibeCheck requiere permisos de micrófono para funcionar.");
        }
    }

    stopEngine() {
        this.active = false;
        if (this.stream) this.stream.getTracks().forEach(t => t.stop());
        cancelAnimationFrame(this.animationId);
        this.updateUI(false);
    }

    updateUI(isActive) {
        if (isActive) {
            this.mainBtn.classList.add('active');
            this.mainBtn.querySelector('span:last-child').textContent = "Detener Escucha";
            this.mainBtn.querySelector('.material-icons-outlined').textContent = "mic_off";
            this.statusBadge.textContent = "Escuchando";
            this.statusBadge.classList.add('active');
        } else {
            this.mainBtn.classList.remove('active');
            this.mainBtn.querySelector('span:last-child').textContent = "Iniciar Escucha";
            this.mainBtn.querySelector('.material-icons-outlined').textContent = "mic";
            this.statusBadge.textContent = "Seguro";
            this.statusBadge.classList.remove('active');
            this.dbDisplay.textContent = "0";
        }
    }

    render() {
        if (!this.active) return;
        this.animationId = requestAnimationFrame(() => this.render());

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);

        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        this.ctx.clearRect(0, 0, width, height);

        // Organic Wave Visualizer (Google Style)
        this.ctx.beginPath();
        this.ctx.moveTo(0, height / 2);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
            const x = (i / bufferLength) * width;
            const v = dataArray[i] / 128.0;
            const y = (v * height) / 2;

            if (i === 0) this.ctx.moveTo(x, height - y);
            else this.ctx.quadraticCurveTo(x - 5, height - y, x, height - y);
        }

        const avg = sum / bufferLength;
        const db = Math.round(20 * Math.log10(avg + 1) * 1.5);

        // Styling the wave
        const gradient = this.ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#6543A3');
        gradient.addColorStop(1, '#B19CD9');
        
        this.ctx.lineTo(width, height);
        this.ctx.lineTo(0, height);
        this.ctx.fillStyle = gradient;
        this.ctx.globalAlpha = 0.4;
        this.ctx.fill();

        this.dbDisplay.textContent = db;

        if (db > 40) { // UI feedback
            this.peakDisplay.textContent = `${db} dB`;
        }

        if (db > this.dbThreshold && !this.sosActive) {
            this.triggerSOS(db);
        }
    }

    triggerSOS(db) {
        this.sosActive = true;
        this.sosOverlay.classList.add('visible');
        this.sosTimer = 10;
        this.sosTimeDisplay.textContent = this.sosTimer;

        if ("vibrate" in navigator) {
            navigator.vibrate([200, 100, 200, 100, 500]);
        }

        this.sosInterval = setInterval(() => {
            this.sosTimer--;
            this.sosTimeDisplay.textContent = this.sosTimer;

            if (this.sosTimer <= 0) {
                clearInterval(this.sosInterval);
                this.finishSOS();
            }
        }, 1000);
    }

    abortSOS() {
        this.sosActive = false;
        this.sosOverlay.classList.remove('visible');
        clearInterval(this.sosInterval);
        if ("vibrate" in navigator) navigator.vibrate(0);
    }

    async finishSOS() {
        this.sosOverlay.classList.remove('visible');
        this.sosActive = false;

        let coords = "Desconocida";
        try {
            const pos = await new Promise((res, rej) => {
                navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 });
            });
            coords = `${pos.coords.latitude},${pos.coords.longitude}`;
        } catch (e) {}

        const msg = `VibeCheck SOS: Evento detectado. Ubicación: https://www.google.com/maps?q=${coords}`;
        
        if (navigator.share) {
            await navigator.share({ title: 'Emergencia VibeCheck', text: msg });
        } else {
            prompt("Envía este mensaje SOS:", msg);
        }
    }
}

// Run
document.addEventListener('DOMContentLoaded', () => {
    new VibeEngine();
});
