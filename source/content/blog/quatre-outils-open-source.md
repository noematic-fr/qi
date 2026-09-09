---
title: "Quatre outils open source — ku, Taurus, Comptoir, proqcm"
description: "Depuis le remaster Godot, quatre outils MIT ont rejoint le catalogue : un TUI sysadmin, un lecteur de sites zippés, un RPG de ville une fois par jour, et des QCM Markdown pour Socrative."
pubDate: 2026-09-09
tags:
  - programming
  - open-source
---

Le mois dernier, j’ai annoncé les premières versions natives Godot d’[Air Fireman](/air-fireman) et [Sheep Dog](/sheep-dog). Depuis, quatre outils open source ont rejoint le [catalogue](/). Ils ne se ressemblent pas — un TUI, un lecteur de zips, un RPG de ville, un CLI de QCM. Ils partagent une idée : **la source durable est un fichier que vous possédez déjà**.

## ku — ce que htop ne fait pas

**[ku](/ku)** est un TUI d’administrateur pour Linux et macOS. CPU, mémoire, volumes et process en direct, comme on s’y attend. Deux vues de plus :

- **Growth** : quels dossiers ont grandi ou disparu, et *pourquoi* (fichier vs arbre récursif)
- **Orphans** : restes d’apps désinstallées — dry-run par défaut, suppression explicite

Rust et [Ratatui](https://ratatui.rs). `cargo install --path .` puis `ku`. Dépôt : [github.com/noematic-eu/ku](https://github.com/noematic-eu/ku).

## Taurus — le zip change, l’app ne change pas

**[Taurus](/taurus)** ouvre un `.zip` de site statique dans sa propre fenêtre. Packs de cours, docs hors-ligne, archives WACZ : le contenu vit dans l’archive, pas dans le binaire. Mettre à jour un cours, c’est envoyer un nouveau zip — pas un nouvel installeur.

Construit avec [Tauri 2](https://tauri.app/). Le pack n’a pas accès aux API Tauri ; le serveur HTTP n’écoute que `127.0.0.1`. macOS, Windows, Linux. Dépôt : [github.com/noematic-eu/taurus](https://github.com/noematic-eu/taurus).

## Comptoir — une ville, une fois par jour

Twine et Ink font de l’hypertexte. Inform, de l’IF à parser. Ren’Py, des VN. **[Comptoir](/comptoir)** occupe l’autre forme : une **ville qu’on visite une fois par jour**, boutiques, plan marchable, jets courts — la lignée des doors BBS.

L’auteur décrit le monde en `.hf` et les scènes en Ink. Un compilateur produit un IR. Une machine à modes le joue, en TUI ou sur un terminal BBS 80×25. On n’écrit pas la boucle de jeu.

Démo : [Cinder Ring](https://github.com/noematic-eu/comptoir/tree/main/testdata/src/cinder_ring), un port en fer à cheval. Dépôt : [github.com/noematic-eu/comptoir](https://github.com/noematic-eu/comptoir).

## proqcm — git est la bibliothèque, Socrative est la salle

[Socrative](https://www.socrative.com/) est une bonne salle de classe en direct : QCM, Space Race, QR, les élèves n’ont pas de compte. Son plan gratuit stocke **cinq QCM**. **[proqcm](/proqcm)** garde les questions en Markdown déjà versionné, puis remplit le **modèle Excel officiel** quand on veut lancer une session.

```
git est la bibliothèque     Socrative est la salle
*.qcm.md  ──export──►  .xlsx  ──import──►  lancer  ──►  vider le slot
```

`go install github.com/noematic-eu/proqcm/cmd/proqcm@latest`. Lint, export papier, export corrigé, pack d’un dossier. Dépôt : [github.com/noematic-eu/proqcm](https://github.com/noematic-eu/proqcm).

## La suite

Tout est MIT. Les jeux que vous écrivez pour Comptoir restent les vôtres.

Si un de ces outils vous sert, le moyen le plus simple de contribuer n’est pas un ticket GitHub : c’est **[OpenSource Contribution](https://payhip.com/b/pVwaY)** sur Payhip — ku / Taurus / proqcm / Comptoir (5 € une fois, ou 2 € / mois). Un ticket ou une étoile restent utiles pour le code.

<a href="https://payhip.com/b/pVwaY" class="btn text-white border border-primary-600/30 bg-primary-600/90 dark:bg-primary-800/80 hover:bg-primary-800 hover:border-primary-800 sm:mb-0 px-8 py-3 w-full rounded-3xl">Contribuer via Payhip</a>

Le classique gratuit d’Air Fireman reste en ligne ; les remasters Godot sont sur la [même boutique](https://payhip.com/noematic). Ce tour-ci, c’est le catalogue open source qui avance.

**Catalogue :** [qi.noematic.fr](/) · **Contribution :** [Payhip](https://payhip.com/b/pVwaY) · **Code :** [github.com/noematic-eu](https://github.com/noematic-eu)
