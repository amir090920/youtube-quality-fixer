// content.js - السكريبت الذي يعمل على صفحة YouTube

class YouTubeQualityManager {
    constructor() {
        this.settings = null;
        this.videoElement = null;
        this.qualityMenuObserver = null;
        this.retryCount = 0;
        this.maxRetries = 10;
        
        this.init();
    }

    async init() {
        console.log('🎬 YouTube Quality Controller - Initializing...');
        
        // تحميل الإعدادات
        await this.loadSettings();
        
        // الاستماع للرسائل من popup
        this.setupMessageListener();
        
        // مراقبة تغييرات الصفحة
        this.setupPageObserver();
        
        // تطبيق الجودة على الفيديو الحالي
        this.applyQualitySettings();
    }

    async loadSettings() {
        const settings = await chrome.storage.sync.get({
            enabled: true,
            quality: 'auto',
            force60fps: false,
            forceHDR: false,
            persistQuality: true
        });
        
        this.settings = settings;
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'updateSettings') {
                this.settings = request.settings;
                this.applyQualitySettings();
            }
        });
    }

    setupPageObserver() {
        // مراقبة تغييرات في الصفحة (للفيديوهات الجديدة)
        const observer = new MutationObserver(() => {
            const currentVideo = document.querySelector('video');
            if (currentVideo && currentVideo !== this.videoElement) {
                this.videoElement = currentVideo;
                this.retryCount = 0;
                setTimeout(() => this.applyQualitySettings(), 1000);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    applyQualitySettings() {
        if (!this.settings.enabled) {
            console.log('🎬 Extension is disabled');
            return;
        }

        // محاولة تطبيق الجودة
        this.trySetQuality();
    }

    trySetQuality() {
        // البحث عن زر الإعدادات
        const settingsButton = document.querySelector('.ytp-settings-button');
        
        if (!settingsButton) {
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                setTimeout(() => this.trySetQuality(), 500);
            }
            return;
        }

        // النقر على زر الإعدادات
        settingsButton.click();

        setTimeout(() => {
            // البحث عن قائمة الجودة
            const qualityMenuItem = Array.from(
                document.querySelectorAll('.ytp-panel-menu .ytp-menuitem')
            ).find(item => {
                const label = item.querySelector('.ytp-menuitem-label');
                return label && (
                    label.textContent.includes('Quality') || 
                    label.textContent.includes('جودة') ||
                    label.textContent.includes('كيفية')
                );
            });

            if (qualityMenuItem) {
                qualityMenuItem.click();
                
                setTimeout(() => {
                    this.selectQuality();
                }, 100);
            } else {
                // إغلاق القائمة إذا لم نجد خيار الجودة
                settingsButton.click();
            }
        }, 100);
    }

    selectQuality() {
        const qualityOptions = document.querySelectorAll('.ytp-quality-menu .ytp-menuitem');
        
        if (qualityOptions.length === 0) {
            this.closeSettingsMenu();
            return;
        }

        let targetOption = null;
        const targetQuality = this.settings.quality;

        if (targetQuality === 'auto') {
            // اختيار الجودة التلقائية
            targetOption = Array.from(qualityOptions).find(option => {
                const text = option.textContent.toLowerCase();
                return text.includes('auto') || text.includes('تلقائي');
            });
        } else if (targetQuality === 'highest') {
            // اختيار أعلى جودة (الخيار الأول عادة)
            targetOption = qualityOptions[0];
        } else if (targetQuality === 'premium') {
            // البحث عن خيار Premium
            targetOption = Array.from(qualityOptions).find(option => {
                const text = option.textContent.toLowerCase();
                return text.includes('premium') || text.includes('enhanced');
            });
            
            // إذا لم نجد Premium، نختار أعلى جودة
            if (!targetOption) {
                targetOption = qualityOptions[0];
            }
        } else {
            // البحث عن الجودة المحددة
            targetOption = this.findQualityOption(qualityOptions, targetQuality);
        }

        if (targetOption) {
            targetOption.click();
            console.log(`🎬 Quality set to: ${targetQuality}`);
            
            // حفظ الجودة في YouTube إذا كان الخيار مفعل
            if (this.settings.persistQuality) {
                this.savePersistentQuality();
            }
        }

        // إغلاق القائمة
        setTimeout(() => this.closeSettingsMenu(), 100);
    }

    findQualityOption(options, targetQuality) {
        // معالجة الجودات الخاصة
        if (targetQuality === 'hd720') {
            return this.findOptionByText(options, ['720p60', '720p 60']);
        }
        if (targetQuality === 'hd1080') {
            return this.findOptionByText(options, ['1080p60', '1080p 60']);
        }

        // البحث عن الجودة العادية
        let bestMatch = null;
        let bestMatchPriority = -1;

        for (const option of options) {
            const text = option.textContent;
            const qualityNumber = targetQuality.replace(/\D/g, '');
            
            if (text.includes(qualityNumber)) {
                // التحقق من fps إذا كان الخيار مفعل
                if (this.settings.force60fps && text.includes('60')) {
                    return option; // أولوية للـ 60fps
                }
                
                // التحقق من HDR إذا كان الخيار مفعل
                if (this.settings.forceHDR && text.toLowerCase().includes('hdr')) {
                    return option; // أولوية للـ HDR
                }
                
                // حفظ أفضل تطابق
                if (!bestMatch) {
                    bestMatch = option;
                }
            }
        }

        return bestMatch;
    }

    findOptionByText(options, searchTexts) {
        for (const option of options) {
            const text = option.textContent.toLowerCase();
            for (const searchText of searchTexts) {
                if (text.includes(searchText.toLowerCase())) {
                    return option;
                }
            }
        }
        return null;
    }

    savePersistentQuality() {
        // محاولة حفظ الإعداد في localStorage الخاص بـ YouTube
        try {
            const qualityPref = {
                quality: this.settings.quality,
                timestamp: Date.now()
            };
            
            localStorage.setItem('yt-player-quality', JSON.stringify(qualityPref));
        } catch (e) {
            console.error('Failed to save persistent quality:', e);
        }
    }

    closeSettingsMenu() {
        const settingsButton = document.querySelector('.ytp-settings-button');
        if (settingsButton) {
            settingsButton.click();
        }
    }
}

// تشغيل المدير عند تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new YouTubeQualityManager();
    });
} else {
    new YouTubeQualityManager();
}

// إعادة التطبيق عند التنقل في YouTube (SPA)
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(() => {
            new YouTubeQualityManager();
        }, 1000);
    }
}).observe(document, { subtree: true, childList: true });