"use strict";
/// <reference types="@figma/plugin-typings" />
figma.showUI(__html__, { width: 340, height: 550 });
figma.ui.onmessage = async (msg) => {
    const selection = figma.currentPage.selection;
    if (selection.length === 0)
        return figma.notify("❌ Select at least one element.");
    // --- BULK CLEAR HANDLER ---
    if (msg.type === 'clear-data') {
        for (const node of selection) {
            node.setSharedPluginData("d2c", "intents", "");
            node.setRelaunchData({});
        }
        figma.notify(`🗑️ Cleared all annotations`);
        return;
    }
    // --- BULK APPLY LOGIC ---
    // content accepts string (link, media, motion) or object (data)
    const applyAnnotationToAll = (content, intentSlot) => {
        let successCount = 0;
        for (const node of selection) {
            try {
                const existingRaw = node.getSharedPluginData("d2c", "intents");
                let allIntents = {};
                if (existingRaw) {
                    try {
                        allIntents = JSON.parse(existingRaw);
                    }
                    catch (e) {
                        allIntents = {};
                    }
                }
                // Assign content (string or structured object)
                allIntents[intentSlot] = content;
                const finalPayload = JSON.stringify(allIntents);
                node.setSharedPluginData("d2c", "intents", finalPayload);
                // Update Sidebar Summary — guard against [object Object] for data intents
                const summaryParts = Object.entries(allIntents).map(([t, s]) => {
                    const display = typeof s === 'object' && s !== null
                        ? `[dataset: ${s.label || 'unnamed'}]`
                        : String(s);
                    return `${t.toUpperCase()}: ${display}`;
                });
                const displaySummary = summaryParts.join(" | ").substring(0, 147);
                node.setRelaunchData({ view_spec: displaySummary });
                successCount++;
            }
            catch (err) {
                console.error(err);
            }
        }
        return successCount;
    };
    // --- LINK / MEDIA HANDLER ---
    if (msg.type === 'add-link') {
        const { type, dest, info } = msg.data;
        const spec = `${dest}${info ? ` (${info})` : ''}`;
        // Routing: Video/Audio → 'media' key, all others → 'link' key
        const intentSlot = (type === 'Video' || type === 'Audio') ? 'media' : 'link';
        const count = applyAnnotationToAll(spec, intentSlot);
        figma.notify(`✅ ${type} intent saved to ${count} elements`);
    }
    // --- MOTION HANDLER ---
    if (msg.type === 'add-motion') {
        const { intents, speed } = msg.data;
        const spec = `${intents.join(', ')} (${speed})`;
        const count = applyAnnotationToAll(spec, "motion");
        figma.notify(`✅ Motion saved to ${count} elements`);
    }
    // --- DATA HANDLER (NEW) ---
    // Stores a structured dynamic-dataset schema under the 'd2c/intents > data' key.
    // Expected msg.data: { label: string, fields: string[] }
    // Output in sharedPluginData:
    //   { "data": { "type": "dynamic-dataset", "label": "...", "fields": ["field1", ...] } }
    if (msg.type === 'add-data') {
        const { label, fields } = msg.data;
        if (!label || !fields || fields.length === 0) {
            figma.notify("❌ Data schema requires a label and at least one field.");
            return;
        }
        const dataIntent = {
            type: "dynamic-dataset",
            label: label.trim(),
            fields: fields.map((f) => f.trim()).filter((f) => f.length > 0)
        };
        const count = applyAnnotationToAll(dataIntent, "data");
        figma.notify(`✅ Data schema "${dataIntent.label}" (${dataIntent.fields.length} fields) saved to ${count} elements`);
    }
};
