// حقن السكريبت مباشرة في صفحة YouTube
(function() {
    // تجنب الحقن المتكرر
    if (window.__ytQualityInjected) return;
    window.__ytQualityInjected = true;

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('youtube-controller.js');
    script.onload = function() {
        this.remove();
    };
    
    (document.head || document.documentElement).appendChild(script);
    
    // إنشاء قناة اتصال
    window.addEventListener('message', function(event) {
        if (event.source !== window) return;
        
        if (event.data.type === 'YT_QUALITY_REQUEST_SETTINGS') {
            chrome.storage.sync.get(null, (settings) => {
                window.postMessage({
                    type: 'YT_QUALITY_SETTINGS',
                    settings: settings
                }, '*');
            });
        }
    });
    
    // الاستماع لتحديثات الإعدادات
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'updateSettings') {
            window.postMessage({
                type: 'YT_QUALITY_SETTINGS',
                settings: request.settings
            }, '*');
        }
    });
})();