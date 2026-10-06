---
title: Comment retrouver un fichier quand les disques s'accumulent
description: Photos, vidéos, musique et documents finissent sur plusieurs disques. Un catalogue local permet de revoir l'arborescence, de chercher par nom ou extension, et de voir les doublons — même quand le disque n'est plus branché.
pubDate: 2024-12-30
tags:
  - fichiers
  - gestion
---

## Pourquoi savoir où sont les fichiers

Avant l'outil, le gain est simple :

 - **Accès :** retrouver un fichier sans brancher les disques un par un.
 - **Place :** voir quels dossiers occupent le volume, et quelles copies existent déjà ailleurs.
 - **Suite :** garder la trace d'un disque au coffre, pas seulement de celui qui est branché.

## Ce que fait Media Cataloger 2

[Media Cataloger 2](/media-cataloger-2) répertorie vos disques dans un catalogue local. Une fois un volume indexé, vous parcourez son arborescence même débranché.

 - **Hors ligne :** dossiers, dates de modification et tailles, disque branché ou non. L'espace libre des volumes locaux et distants se lit d'un coup d'œil.
 - **Place occupée :** quels dossiers et fichiers prennent le plus de place.
 - **Recherche :** par nom ou par extension, sur tous les disques catalogués.
 - **Doublons :** copies sur un disque ou entre plusieurs, listes par sujet ou par propriétaire, fichiers qui n'existent qu'à un seul endroit.
 - **SSH :** cataloguer les disques d'un ordinateur distant.
 - **Chez vous :** cataloguer, chercher et voir les doublons ne demande pas internet.

Ce n'est pas un DAM, pas iTunes, pas un éditeur EXIF, pas un outil de sauvegarde. Pas de tags, pas de recherche dans le texte des documents, pas de partage de collection.

Sur macOS, deux applications, un moteur : Swift + nmcd (native) et nmcui (Go / Fyne). Sur Windows et Linux, le build Go. La licence reçue par email se colle dans le téléchargement du 15 octobre. L’application Mac habituelle ne lit pas encore ce fichier.

## Étapes

1. **Indexer un volume.** Le parcours des dossiers se fait en parallèle.
2. **Relire plus tard.** L'arborescence et l'espace restent consultables, disque débranché.
3. **Chercher** par nom ou par extension.
4. **Repérer** les doublons et les fichiers uniques, puis retirer les copies en trop si vous le décidez.
5. **Une autre machine :** cataloguer ses disques en SSH.

## Les deux pages

[Media Cataloger 2](/media-cataloger-2) est la version en cours (beta 0.2). Il n'y a pas encore de zip public. Les zips **0.0.1**, gratuits et limités à 1 disque (Mac Intel, Windows, Linux), restent sur [Media Cataloger](/media-cataloger). Une licence déjà envoyée se colle dans le téléchargement du 15 octobre. L’application Mac habituelle ne lit pas encore ce fichier.

<a href="/media-cataloger-2" class="btn text-white border border-primary-600/30 bg-primary-600/90 dark:bg-primary-800/80 hover:bg-primary-800 hover:border-primary-800 sm:mb-0 px-8 py-3 w-full rounded-3xl">Voir Media Cataloger 2</a>
