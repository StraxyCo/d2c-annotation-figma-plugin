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

  // --- BULK APPLY LOGIC ---
  // content accepts string (link, media, motion) or object (data)
  const applyAnnotationToAll = (content: string | object, intentSlot: string) => {
    let successCount = 0;
    for (const node of selection) {
      try {
        const existingRaw = node.getSharedPluginData("d2c", "intents");
        let allIntents: any = {};
        if (existingRaw) {
          try { allIntents = JSON.parse(existingRaw); } catch (e) { allIntents = {}; }
        }

        allIntents[intentSlot] = content;

        node.setSharedPluginData("d2c", "intents", JSON.stringify(allIntents));

        // Sidebar summary — guard against [object Object] for data intents
        const summaryParts = Object.entries(allIntents).map(([t, s]) => {
          const display =
            typeof s === 'object' && s !== null
              ? `[dataset: ${(s as any).label || 'unnamed'}]`
              : String(s);
          return `${t.toUpperCase()}: ${display}`;
        });
        node.setRelaunchData({ view_spec: summaryParts.join(" | ").substring(0, 147) });

        successCount++;
      } catch (err) { console.error(err); }
    }
    return successCount;
  };

  // --- LINK / MEDIA HANDLER ---
  if (msg.type === 'add-link') {
    const { type, dest, info } = msg.data;
    const spec = `${dest}${info ? ` (${info})` : ''}`;
    const intentSlot = (type === 'Video' || type === 'Audio') ? 'media' : 'link';
    const count = applyAnnotationToAll(spec, intentSlot);
    figma.notify(`✅ ${type} intent saved to ${count} elements`);
  }

  // --- MOTION HANDLER (FIXED: behavior + info now included in spec) ---
  if (msg.type === 'add-motion') {
    const { intents, speed, behavior, info } = msg.data;
    const parts = [`${intents.join(', ')}`, `${speed}/${behavior}`];
    if (info && info.trim()) parts.push(info.trim());
    const spec = parts.join(' — ');
    const count = applyAnnotationToAll(spec, "motion");
    figma.notify(`✅ Motion saved to ${count} elements`);
  }

  // --- FIELD AUTO-DETECTION HANDLER ---
  // Traverses the selected node's tree (or its mainComponent if INSTANCE).
  // Detects: Label/* → text fields, [Slot]/* → asset/media fields.
  if (msg.type === 'detect-fields') {
    const node = selection[0];

    // Navigate to master component for reliable canonical structure
    const target: SceneNode =
      node.type === 'INSTANCE' && (node as InstanceNode).mainComponent
        ? (node as InstanceNode).mainComponent!
        : node;

    const fields: string[] = [];
    const seen = new Set<string>();

    const traverse = (n: SceneNode) => {
      const name = n.name.trim();

      // Label/* → text content field (snake_case from label name)
      if (name.startsWith('Label/')) {
        const raw = name.slice('Label/'.length).toLowerCase().replace(/[\s\-\/]+/g, '_');
        if (raw && !seen.has(raw)) { fields.push(raw); seen.add(raw); }
      }

      // [Slot] * → asset field (_url suffix for visual media)
      if (name.startsWith('[Slot]')) {
        const raw = name.slice('[Slot]'.length).trim();
        const isMedia = /image|video|audio|photo|img|pic/i.test(raw);
        const fieldName = raw.toLowerCase().replace(/[\s\-\/]+/g, '_') + (isMedia ? '_url' : '');
        if (fieldName && !seen.has(fieldName)) { fields.push(fieldName); seen.add(fieldName); }
      }

      // Recurse into children
      if ('children' in n) {
        for (const child of (n as ChildrenMixin).children) traverse(child);
      }
    };

    traverse(target);

    // Suggested label: strip category prefix from component name
    const componentName = target.name.replace(/^(Section|Molecule|Atom)\//, '').replace(/\//g, ' ');

    figma.ui.postMessage({ type: 'fields-detected', fields, componentName });
  }

  // --- DATA HANDLER ---
  // Stores { type, label, fields[] } under d2c/intents > 'data' key.
  if (msg.type === 'add-data') {
    const { label, fields } = msg.data;

    if (!label || !fields || fields.length === 0) {
      figma.notify("❌ Data schema requires a label and at least one field.");
      return;
    }

    const dataIntent = {
      type: "dynamic-dataset",
      label: label.trim(),
      fields: (fields as string[]).map(f => f.trim()).filter(f => f.length > 0)
    };

    const count = applyAnnotationToAll(dataIntent, "data");
    figma.notify(`✅ Data schema "${dataIntent.label}" (${dataIntent.fields.length} fields) saved to ${count} elements`);
  }
};