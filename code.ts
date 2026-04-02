/// <reference types="@figma/plugin-typings" />

figma.showUI(__html__, { width: 340, height: 550 });

figma.ui.onmessage = async (msg: any) => {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) return figma.notify("❌ Select a layer");
  const node = selection[0];

  // --- NEW: CLEAR DATA HANDLER ---
  if (msg.type === 'clear-data') {
    try {
      // 1. Wipe Shared Plugin Data
      node.setSharedPluginData("d2c", "intents", "");
      
      // 2. Remove Relaunch Button from Sidebar
      node.setRelaunchData({});
      
      figma.notify("🗑️ All annotations cleared for this layer");
      console.log(`Cleared all D2C data for: ${node.name}`);
    } catch (e) {
      figma.notify("❌ Failed to clear data");
    }
    return;
  }

  // --- EXISTING ANNOTATION LOGIC ---
  const applyAnnotation = (content: string, type: string) => {
    try {
      const existingRaw = node.getSharedPluginData("d2c", "intents");
      let allIntents: any = {};
      
      if (existingRaw) {
        try { allIntents = JSON.parse(existingRaw); } catch (e) { allIntents = {}; }
      }

      allIntents[type.toLowerCase()] = content;

      const finalPayload = JSON.stringify(allIntents);
      node.setSharedPluginData("d2c", "intents", finalPayload);

      const summaryParts = Object.entries(allIntents).map(([t, s]) => `${t.toUpperCase()}: ${s}`);
      const fullSummary = summaryParts.join(" | ");
      const displaySummary = fullSummary.length > 150 ? fullSummary.substring(0, 147) + "..." : fullSummary;

      node.setRelaunchData({ view_spec: displaySummary });
      return true;
    } catch (e) {
      return false;
    }
  };

  if (msg.type === 'add-link') {
    const { dest, info } = msg.data;
    const spec = `${dest}${info ? ` (${info})` : ''}`;
    if (applyAnnotation(spec, "Link")) figma.notify("✅ Link Saved");
  }

  if (msg.type === 'add-motion') {
    const { intents, speed } = msg.data;
    const spec = `${intents.join(', ')} (${speed})`;
    if (applyAnnotation(spec, "Motion")) figma.notify("✅ Motion Saved");
  }
};