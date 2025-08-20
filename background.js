// Service Worker
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        chrome.storage.sync.set({
            enabled: true,
            quality: '1080',
            highestQuality: false,
            premiumBitrate: false,
            prefer60fps: false,
            preferHDR: false
        });
        
        console.log('YouTube Quality Master installed!');
    }
});

// مراقبة التبويبات الجديدة
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url?.includes('youtube.com')) {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['injector.js']
        }).catch((error) => {
            console.log('Script already injected or error:', error);
        });
    }
});

// الاستماع للرسائل
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSettings') {
        chrome.storage.sync.get(null, (settings) => {
            sendResponse(settings);
        });
        return true;
    }
});