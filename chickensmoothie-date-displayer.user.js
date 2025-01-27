// ==UserScript==
// @name         Haru's ChickenSmoothie Item Date Finder
// @namespace    https://haruyuki.moe/
// @version      1.0.0
// @description  Displays the release date of items in the trade screen
// @author       blumewmew
// @match        https://www.chickensmoothie.com/trades/viewtrade.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=haruyuki.moe
// @require      https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js
// @grant        GM_xmlhttpRequest
// @connect      amazonaws.com
// @license      MIT
// @homepage     https://haruyuki.moe/
// ==/UserScript==

(async function() {
    'use strict';

    // Obfuscated URL components
    const URL_PARTS = [
        'aHR0cHM6Ly9jc3BvdW5k', // Base64 for "https://cspound"
        'LnMzLnVzLWVhc3Qt',     // ".s3.us-east-"
        'MS5hbWF6b25hd3MuY29tL2RhdGFiYXNlLmNzdg==' // "1.amazonaws.com/database.csv"
    ];

    // Dynamic URL assembly
    const CSV_URL = URL_PARTS.map(part => {
        return atob(part.replace(/_/g, ''));
    }).join('');

    let csvMap = new Map();

    // Load and parse CSV
    try {
        const csvText = await new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: CSV_URL,
                onload: (r) => resolve(r.responseText),
                onerror: reject
            });
        });

        Papa.parse(csvText, {
            header: true,
            complete: (results) => {
                results.data.forEach(row => {
                    const key = `${row.itemLID}-${row.itemRID}`;
                    csvMap.set(key, row);
                });
            }
        });
    } catch (error) {
        console.error('CSV load failed:', error);
        return;
    }

    // Process items after full load
    window.addEventListener('load', () => {
        document.querySelectorAll('li.item').forEach(item => {
            const img = item.querySelector('img');
            if (!img) return;

            const ids = extractIds(img.src);
            if (!ids) return;

            const table = item.querySelector('table');
            const tbody = table?.querySelector('tbody');
            const existingRows = tbody?.querySelectorAll('tr');

            if (!tbody || !existingRows || existingRows.length < 2) return;

            // Get matching data
            const key = `${ids.itemLID}-${ids.itemRID}`;
            const data = csvMap.get(key);

            // Create new row
            const newRow = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 2;
            cell.textContent = data ? `${data.itemYear} ${data.itemEvent}` : 'Unknown origin';

            newRow.appendChild(cell);
            tbody.insertBefore(newRow, existingRows[0].nextSibling);
        });
    });

    function extractIds(url) {
        const match = url.match(/\/item\/(\d+)&p=(\d+)/);
        return match ? { itemLID: match[1], itemRID: match[2] } : null;
    }
})();
