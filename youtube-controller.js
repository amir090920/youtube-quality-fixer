// التحكم المباشر في YouTube Player API
(function() {
    'use strict';
    
    let settings = {
        enabled: true,
        quality: '1080',
        highestQuality: false,
        premiumBitrate: false,
        prefer60fps: false,
        preferHDR: false
    };
    
    let playerInstance = null;
    let isSettingQuality = false;
    
    // طلب الإعدادات
    function requestSettings() {
        window.postMessage({ type: 'YT_QUALITY_REQUEST_SETTINGS' }, '*');
    }
    
    // الاستماع للإعدادات
    window.addEventListener('message', function(event) {
        if (event.source !== window) return;
        
        if (event.data.type === 'YT_QUALITY_SETTINGS') {
            settings = event.data.settings;
            applyQuality();
        }
    });
    
    // العثور على مشغل YouTube
    function findPlayer() {
        // محاولة الحصول على المشغل من الـ API
        const moviePlayer = document.getElementById('movie_player');
        if (moviePlayer && moviePlayer.getAvailableQualityLevels) {
            return moviePlayer;
        }
        
        // البحث في الكائنات العامة
        if (window.ytplayer && window.ytplayer.config) {
            return window.ytplayer.config.args.player_response;
        }
        
        return null;
    }
    
    // تطبيق الجودة
    function applyQuality() {
        if (!settings.enabled || isSettingQuality) return;
        
        const player = findPlayer();
        if (!player) {
            setTimeout(applyQuality, 1000);
            return;
        }
        
        isSettingQuality = true;
        playerInstance = player;
        
        try {
            const availableQualities = player.getAvailableQualityLevels();
            
            if (!availableQualities || availableQualities.length === 0) {
                isSettingQuality = false;
                return;
            }
            
            let targetQuality = null;
            
            if (settings.highestQuality) {
                // اختيار أعلى جودة
                targetQuality = availableQualities[0];
            } else {
                // البحث عن الجودة المطلوبة
                targetQuality = findBestQuality(availableQualities);
            }
            
            if (targetQuality) {
                // تطبيق الجودة
                if (settings.premiumBitrate && player.setPlaybackQualityRange) {
                    // محاولة تفعيل Premium bitrate
                    player.setPlaybackQualityRange(targetQuality, targetQuality);
                }
                
                player.setPlaybackQuality(targetQuality);
                player.setPlaybackQualityRange(targetQuality, targetQuality);
                
                console.log(`✅ Quality set to: ${targetQuality}`);
            }
            
        } catch (error) {
            console.error('Error setting quality:', error);
        } finally {
            isSettingQuality = false;
        }
    }
    
    // إيجاد أفضل جودة مطابقة
    function findBestQuality(availableQualities) {
        const qualityMap = {
            '144': ['tiny', 'small144'],
            '240': ['small', 'small240'],
            '360': ['medium', 'medium360'],
            '480': ['large', 'large480'],
            '720': ['hd720'],
            '1080': ['hd1080'],
            '2160': ['hd2160', '4k'],
            '4320': ['hd4320', '8k']
        };
        
        const targetQualities = qualityMap[settings.quality] || [];
        
        for (const quality of availableQualities) {
            const qualityLower = quality.toLowerCase();
            
            // التحقق من المطابقة المباشرة
            for (const target of targetQualities) {
                if (qualityLower.includes(target)) {
                    // التحقق من 60fps
                    if (settings.prefer60fps && qualityLower.includes('60')) {
                        return quality;
                    }
                    // التحقق من HDR
                    if (settings.preferHDR && qualityLower.includes('hdr')) {
                        return quality;
                    }
                    
                    // إذا لم نجد الخيارات المفضلة، نعيد الجودة العادية
                    if (!settings.prefer60fps && !settings.preferHDR) {
                        return quality;
                    }
                }
            }
        }
        
        // إرجاع أقرب جودة متاحة
        return targetQualities[0] || null;
    }
    
    // مراقبة تغييرات الفيديو
    function observeVideoChanges() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    const video = document.querySelector('video');
                    if (video && video.src) {
                        setTimeout(applyQuality, 1500);
                    }
                }
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // مراقبة تغيير URL
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                if (url.includes('/watch')) {
                    setTimeout(applyQuality, 2000);
                }
            }
        }).observe(document, {subtree: true, childList: true});
    }
    
    // مراقبة أحداث المشغل
    function hookPlayerEvents() {
        // التقاط أحداث تغيير الفيديو
        document.addEventListener('yt-navigate-finish', () => {
            setTimeout(applyQuality, 1500);
        });
        
        // التقاط بداية تشغيل الفيديو
        document.addEventListener('yt-player-updated', () => {
            setTimeout(applyQuality, 1000);
        });
        
        // مراقبة حالة المشغل
        const checkPlayerState = setInterval(() => {
            const player = findPlayer();
            if (player && player.getPlayerState && player.getPlayerState() === 1) {
                clearInterval(checkPlayerState);
                applyQuality();
            }
        }, 1000);
    }
    
    // التهيئة
    function init() {
        console.log('🎬 YouTube Quality Controller Active');
        requestSettings();
        observeVideoChanges();
        hookPlayerEvents();
        
        // تطبيق أولي
        setTimeout(applyQuality, 2000);
    }
    
    // البدء عند تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();