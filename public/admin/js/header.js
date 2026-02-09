/**
 * Admin Header Interactions
 * Handles Search, Notifications, and Settings dropdowns
 */

document.addEventListener('DOMContentLoaded', () => {
    initSearch();
    initNotifications();
    initSettings();
    initProfile();
});

function initSearch() {
    const searchBtn = document.getElementById('header-search-btn');
    const searchContainer = document.getElementById('header-search-container');
    const searchInput = document.getElementById('header-search-input');

    if (!searchBtn || !searchContainer) return;

    searchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeOtherDropdowns('search');
        searchContainer.classList.toggle('hidden');
        searchContainer.classList.toggle('flex');
        if (!searchContainer.classList.contains('hidden')) {
            searchInput.focus();
        }
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !searchContainer.classList.contains('hidden')) {
            searchContainer.classList.add('hidden');
            searchContainer.classList.remove('flex');
        }
    });
}

function initNotifications() {
    const notifyBtn = document.getElementById('header-notify-btn');
    const notifyDropdown = document.getElementById('header-notify-dropdown');

    if (!notifyBtn || !notifyDropdown) return;

    notifyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeOtherDropdowns('notify');
        notifyDropdown.classList.toggle('hidden');
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!notifyDropdown.contains(e.target) && !notifyBtn.contains(e.target)) {
            notifyDropdown.classList.add('hidden');
        }
    });
}

function initSettings() {
    const settingsBtn = document.getElementById('header-settings-btn');
    const settingsDropdown = document.getElementById('header-settings-dropdown');

    if (!settingsBtn || !settingsDropdown) return;

    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeOtherDropdowns('settings');
        settingsDropdown.classList.toggle('hidden');
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!settingsDropdown.contains(e.target) && !settingsBtn.contains(e.target)) {
            settingsDropdown.classList.add('hidden');
        }
    });
}

function initProfile() {
    const profileArea = document.getElementById('header-profile-area');
    const profileDropdown = document.getElementById('header-profile-dropdown');

    if (!profileArea || !profileDropdown) return;

    profileArea.addEventListener('click', (e) => {
        e.stopPropagation();
        closeOtherDropdowns('profile');
        profileDropdown.classList.toggle('hidden');
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!profileDropdown.contains(e.target) && !profileArea.contains(e.target)) {
            profileDropdown.classList.add('hidden');
        }
    });
}

function closeOtherDropdowns(current) {
    const notifyDropdown = document.getElementById('header-notify-dropdown');
    const settingsDropdown = document.getElementById('header-settings-dropdown');
    const profileDropdown = document.getElementById('header-profile-dropdown');
    const searchContainer = document.getElementById('header-search-container');

    if (current !== 'notify' && notifyDropdown) notifyDropdown.classList.add('hidden');
    if (current !== 'settings' && settingsDropdown) settingsDropdown.classList.add('hidden');
    if (current !== 'profile' && profileDropdown) profileDropdown.classList.add('hidden');
    if (current !== 'search' && searchContainer) {
        searchContainer.classList.add('hidden');
        searchContainer.classList.remove('flex');
    }
}
