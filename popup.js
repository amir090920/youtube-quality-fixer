class QualityController {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.attachEventListeners();
        this.updateUI();
    }

    async loadSettings() {
        const settings = await chrome.storage.sync.get({
            enabled: true,
            quality: '1080',
            highestQuality: false,
            premiumBitrate: false,
            prefer60fps: false,
            preferHDR: false
        });
        this.settings = settings;
    }

    async saveSettings() {
        await chrome.storage.sync.set(this.settings);
        
        // إرسال الإعدادات للصفحة
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        if (tabs[0]?.url?.includes('youtube.com')) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'updateSettings',
                settings: this.settings
            }).catch(() => {
                // إعادة حقن السكريبت إذا لزم
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ['injector.js']
                });
            });
        }
        
        this.showStatus('تم الحفظ', 'success');
    }

    attachEventListeners() {
        // زر التشغيل
        document.getElementById('powerToggle').addEventListener('change', (e) => {
            this.settings.enabled = e.target.checked;
            this.saveSettings();
        });

        // أعلى جودة متاحة
        document.getElementById('highestQuality').addEventListener('change', (e) => {
            this.settings.highestQuality = e.target.checked;
            this.toggleQualityList(!e.target.checked);
            this.saveSettings();
        });

        // قائمة الجودات
        document.querySelectorAll('.quality-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!this.settings.highestQuality) {
                    this.settings.quality = e.target.dataset.quality;
                    this.updateQualitySelection();
                    this.saveSettings();
                }
            });
        });

        // الخيارات الإضافية
        document.getElementById('premiumBitrate').addEventListener('change', (e) => {
            this.settings.premiumBitrate = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('prefer60fps').addEventListener('change', (e) => {
            this.settings.prefer60fps = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('preferHDR').addEventListener('change', (e) => {
            this.settings.preferHDR = e.target.checked;
            this.saveSettings();
        });
    }

    updateUI() {
        document.getElementById('powerToggle').checked = this.settings.enabled;
        document.getElementById('highestQuality').checked = this.settings.highestQuality;
        document.getElementById('premiumBitrate').checked = this.settings.premiumBitrate;
        document.getElementById('prefer60fps').checked = this.settings.prefer60fps;
        document.getElementById('preferHDR').checked = this.settings.preferHDR;
        
        this.toggleQualityList(!this.settings.highestQuality);
        this.updateQualitySelection();
    }

    toggleQualityList(show) {
        const list = document.getElementById('qualityList');
        if (show) {
            list.classList.remove('hidden');
        } else {
            list.classList.add('hidden');
        }
    }

    updateQualitySelection() {
        document.querySelectorAll('.quality-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.quality === this.settings.quality) {
                item.classList.add('active');
            }
        });
    }

    showStatus(message, type = '') {
        const statusBar = document.querySelector('.status-bar');
        const statusText = document.getElementById('statusText');
        
        statusText.textContent = message;
        statusBar.className = 'status-bar ' + type;
        
        setTimeout(() => {
            statusBar.className = 'status-bar';
            statusText.textContent = 'جاهز';
        }, 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new QualityController();
});