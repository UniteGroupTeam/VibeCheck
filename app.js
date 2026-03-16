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
        
        // Contacts logic
        this.contacts = JSON.parse(localStorage.getItem('vibe_contacts') || '[]');
        this.isPro = false;

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
        
        // Contacts DOM
        this.contactsBtn = document.getElementById('contacts-btn-trigger');
        this.contactsModal = document.getElementById('contacts-modal');
        this.closeContactsBtn = document.getElementById('close-contacts');
        this.addContactBtn = document.getElementById('add-contact-btn');
        this.contactsList = document.getElementById('contacts-list');
        this.contactCountDisplay = document.getElementById('contact-count');
        this.paywallModal = document.getElementById('paywall-modal');
        this.closePaywallBtn = document.getElementById('close-paywall');

        // PWA Install Logic
        this.deferredPrompt = null;
        this.installSnackbar = document.getElementById('pwa-snackbar');
        this.installBtn = document.getElementById('pwa-install-btn');
        this.navInstallBtn = document.getElementById('nav-install');

        this.init();
    }

    init() {
        this.setupCanvas();
        this.renderContacts();
        this.setupPWAInstall();
        window.addEventListener('resize', () => this.setupCanvas());

        // Event Listeners
        this.mainBtn.addEventListener('click', () => this.toggleEngine());
        this.cancelSosBtn.addEventListener('click', () => this.abortSOS());
        this.settingsBtn.addEventListener('click', () => this.settingsPanel.classList.add('open'));
        this.closePanelBtn.addEventListener('click', () => this.settingsPanel.classList.remove('open'));
        
        this.sensitivitySlider.addEventListener('input', (e) => {
            this.dbThreshold = parseInt(e.target.value);
        });

        // Contacts listeners
        this.contactsBtn.addEventListener('click', () => {
             this.contactsModal.classList.add('open');
        });
        this.closeContactsBtn.addEventListener('click', () => {
             this.contactsModal.classList.remove('open');
        });
        this.addContactBtn.addEventListener('click', () => this.handleAddContact());
        this.closePaywallBtn.addEventListener('click', () => this.paywallModal.classList.remove('visible'));
    }

    setupPWAInstall() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            
            // Show snackbar for 15 seconds
            this.installSnackbar.classList.remove('hidden');
            setTimeout(() => {
                this.installSnackbar.classList.add('hidden');
            }, 15000);
        });

        const handleInstall = async () => {
            if (this.deferredPrompt) {
                this.deferredPrompt.prompt();
                const { outcome } = await this.deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    console.log('User accepted the PWA install');
                }
                this.deferredPrompt = null;
                this.installSnackbar.classList.add('hidden');
            } else {
                // iPhone / Support fallback
                alert("Para instalar en iOS:\n1. Toca el botón 'Compartir' (cuadrado con flecha).\n2. Selecciona 'Añadir a la pantalla de inicio'.");
            }
        };

        this.installBtn.addEventListener('click', handleInstall);
        this.navInstallBtn.addEventListener('click', handleInstall);

        window.addEventListener('appinstalled', () => {
            console.log('PWA installed');
            this.installSnackbar.classList.add('hidden');
        });
    }

    renderContacts() {
        this.contactsList.innerHTML = '';
        this.contacts.forEach((c, index) => {
            const div = document.createElement('div');
            div.className = 'contact-item';
            div.innerHTML = `
                <div class="contact-info">
                    <span class="contact-name">${c.name}</span>
                    <span class="contact-phone">${c.phone}</span>
                </div>
                <button class="icon-btn delete-contact" data-index="${index}" style="color: var(--md-sys-color-error)">
                    <span class="material-icons-outlined">delete</span>
                </button>
            `;
            this.contactsList.appendChild(div);
        });

        document.querySelectorAll('.delete-contact').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.currentTarget.dataset.index;
                this.contacts.splice(index, 1);
                this.saveContacts();
            });
        });

        this.contactCountDisplay.textContent = this.contacts.length;
    }

    handleAddContact() {
        if (this.contacts.length >= 3 && !this.isPro) {
            this.paywallModal.classList.add('visible');
            return;
        }

        const name = prompt("Nombre del contacto:");
        const phone = prompt("Número de teléfono:");
        
        if (name && phone) {
            this.contacts.push({ name, phone });
            this.saveContacts();
        }
    }

    saveContacts() {
        localStorage.setItem('vibe_contacts', JSON.stringify(this.contacts));
        this.renderContacts();
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
            // Updated GPS Warm-up and Status check
            this.updateGPSStatus('Verificando...');
            
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Re-sync Audio Context
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (this.audioCtx.state === 'suspended') {
                await this.audioCtx.resume();
            }

            const source = this.audioCtx.createMediaStreamSource(this.stream);
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);

            this.active = true;
            this.updateUI(true);
            this.render();
            
            // Warm up GPS immediately when monitoring starts
            this.warmupGPS();
            
            this.vibrate(100);
            console.log("VibeEngine Started");
        } catch (err) {
            console.error(err);
            alert("Error: Activa el micrófono y los permisos de ubicación.");
        }
    }

    updateGPSStatus(status, isError = false) {
        const el = document.getElementById('gps-status');
        if (el) {
            el.textContent = status;
            el.style.color = isError ? 'var(--md-sys-color-error)' : 'inherit';
        }
    }

    warmupGPS() {
        if (!navigator.geolocation) {
            this.updateGPSStatus('No compatible', true);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            () => this.updateGPSStatus('Listo'),
            (err) => {
                console.warn("GPS Warmup failed:", err);
                this.updateGPSStatus('Fallo / Sin Permiso', true);
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    }

    vibrate(pattern) {
        if ("vibrate" in navigator) {
            navigator.vibrate(pattern);
        }
    }

    stopEngine() {
        this.active = false;
        if (this.stream) this.stream.getTracks().forEach(t => t.stop());
        if (this.audioCtx) this.audioCtx.close();
        cancelAnimationFrame(this.animationId);
        this.updateUI(false);
        this.updateGPSStatus('Inactivo');
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

        this.ctx.beginPath();
        this.ctx.moveTo(0, height);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
            const x = (i / bufferLength) * width;
            const v = dataArray[i] / 128.0;
            const y = (v * height) / 1.5;

            this.ctx.lineTo(x, height - y);
        }

        const avg = sum / bufferLength;
        const dbValue = Math.round(avg * 0.8);

        this.dbDisplay.textContent = dbValue;
        this.ctx.lineTo(width, height);
        this.ctx.fillStyle = dbValue > this.dbThreshold ? 'rgba(186, 26, 26, 0.4)' : 'rgba(101, 67, 163, 0.3)';
        this.ctx.fill();

        if (dbValue > this.dbThreshold && !this.sosActive) {
            this.triggerSOS(dbValue);
        }
    }

    triggerSOS(db) {
        this.sosActive = true;
        this.sosOverlay.classList.add('visible');
        this.sosTimer = 10;
        this.sosTimeDisplay.textContent = this.sosTimer;
        this.peakDisplay.textContent = `${db} dB`;

        this.vibrate([1000, 500, 1000, 500, 1000]);

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
        this.vibrate(0);
    }

    async finishSOS() {
        this.sosOverlay.classList.remove('visible');
        this.sosActive = false;
        this.vibrate(0);

        this.updateGPSStatus('Obteniendo ubicación...');
        
        let mapsLink = "Ubicación no disponible";
        try {
            const pos = await new Promise((res, rej) => {
                navigator.geolocation.getCurrentPosition(res, rej, { 
                    enableHighAccuracy: true,
                    timeout: 12000 // Increased timeout for better locks
                });
            });
            mapsLink = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
            this.updateGPSStatus('Listo');
        } catch (e) {
            console.error("GPS Full Error:", e);
            this.updateGPSStatus('Error GPS', true);
        }

        const contactNames = this.contacts.map(c => c.name).join(', ');
        const msg = `🚨 ALERTA VIBECHECK 🚨\nSe ha detectado una emergencia.\nMi ubicación: ${mapsLink}\nContactos avisados: ${contactNames || 'Sin contactos configurados'}`;
        
        if (navigator.share) {
            await navigator.share({ 
                title: 'Emergencia VibeCheck', 
                text: msg,
                url: mapsLink.includes('google.com') ? mapsLink : undefined
            });
        } else {
            prompt("ATENCIÓN: Envía este mensaje de emergencia inmediatamente:", msg);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.vibeApp = new VibeEngine();
});
