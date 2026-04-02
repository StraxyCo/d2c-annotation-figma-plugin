# 🛠️ Straxy D2C Annotator (Figma Plugin)

Plugin d'annotation pour l'écosystème **Straxy Factory**. Permet aux designers d'injecter des intentions de mouvement (Motion Intent) et des liens/médias directement dans les éléments Figma via le Dev Mode.

## 🚀 Setup
1. Clonez ce repo.
2. Allez dans Figma : `Plugins > Development > Import plugin from manifest...` et sélectionnez `manifest.json`.
3. Lancez le plugin.

## 📁 Structure
- `/assets/motions/` : Héberge les GIFs d'aperçu publics.
- `/data/motion-registry.json` : Source de vérité visuelle pour le plugin.
- `code.ts` : Contrôleur gérant l'écriture des annotations au format `[Link]` ou `[Motion]`.

## ⚖️ Laws Compliance
- **Law #14 (Motion)** : Les IDs d'intentions doivent correspondre au `motion-registry.json`.
- **Law #16 (Link)** : Formatage strict `[Link] Type: [URL/Video/Audio] | Dest: [URL/TBD]`.