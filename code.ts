/// <reference types="@figma/plugin-typings" />

figma.showUI(__html__, { width: 340, height: 550 });

figma.ui.onmessage = async (msg: any) => {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) return figma.notify("❌ Select at least one element.");

  // --- BULK CLEAR HANDLER ---
  if (msg.type === 'clear-data') {
    for (const node of selection) {
      node.setSharedPluginData("d2c", "intents", "");
      node.setRelaunchData({});
    }
    figma.notify(`🗑️ Cleared all annotations`);
    return;
  }

  // --- REFINED BULK APPLY LOGIC ---
  const applyAnnotationToAll = (content: string, intentSlot: string) => {
    let successCount = 0;
    for (const node of selection) {
      try {
        const existingRaw = node.getSharedPluginData("d2c", "intents");
        let allIntents: any = {};
        
        if (existingRaw) {
          try { allIntents = JSON.parse(existingRaw); } catch (e) { allIntents = {}; }
        }

        // Use distinct keys: 'link', 'media', or 'motion'
        allIntents[intentSlot] = content;

        const finalPayload = JSON.stringify(allIntents);
        node.setSharedPluginData("d2c", "intents", finalPayload);

        // Update Sidebar Summary
        const summaryParts = Object.entries(allIntents).map(([t, s]) => `${t.toUpperCase()}: ${s}`);
        const displaySummary = summaryParts.join(" | ").substring(0, 147);
        node.setRelaunchData({ view_spec: displaySummary });
        
        successCount++;
      } catch (err) { console.error(err); }
    }
    return successCount;
  };

  if (msg.type === 'add-link') {
    const { type, dest, info } = msg.data;
    const spec = `${dest}${info ? ` (${info})` : ''}`;
    
    // ROUTING LOGIC: Distinguish between navigation and media
    const intentSlot = (type === 'Video' || type === 'Audio') ? 'media' : 'link';
    const count = applyAnnotationToAll(spec, intentSlot);
    
    figma.notify(`✅ ${type} intent saved to ${count} elements`);
  }

  if (msg.type === 'add-motion') {
    const { intents, speed } = msg.data;
    const spec = `${intents.join(', ')} (${speed})`;
    const count = applyAnnotationToAll(spec, "motion");
    figma.notify(`✅ Motion saved to ${count} elements`);
  }
};