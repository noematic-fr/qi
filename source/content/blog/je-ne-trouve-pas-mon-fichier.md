---
title: Je ne trouve pas mes fichiers quand j'en ai besoin.
description: Application de la méthode des 5 Pourquoi
pubDate: 2024-12-31
tags:
  - fichiers
  - gestion
---

1. Pourquoi ne trouves-tu pas tes fichiers ? Parce qu'ils sont répartis sur des disques que je ne branche pas tous.
1. Pourquoi cette répartition pose problème ? Parce que je n'ai pas le catalogue du disque une fois qu'il est débranché.
1. Pourquoi n'as-tu pas ce catalogue ? Parce que je ne dispose pas d'un outil qui indexe le volume et le garde en local.
1. Pourquoi n'as-tu pas un tel outil ? Parce que je cherchais un logiciel de médiathèque, de tags ou de sauvegarde.
1. Pourquoi cette piste ? Parce que je n'avais pas vu qu'un catalogue de disques suffit pour savoir où est le fichier.

## Comment Media Cataloger 2 répond

### Catalogue local

Indexer un volume enregistre l'arborescence, les dates de modification et les tailles. Le disque peut ensuite rester au coffre : le catalogue est sur la machine.

### Recherche

Par nom ou par extension, sur les disques catalogués, connectés ou non. Pas de recherche dans le texte des documents.

### Doublons et fichiers uniques

Copies sur un même disque ou entre plusieurs. Listes par sujet, propriétaire, ou un autre critère. Fichiers présents sur un seul disque. Retirer une copie en trop se décide ensuite : ce n'est pas une sauvegarde.

### Sans compte en ligne

Cataloguer, chercher et voir les doublons ne demande pas internet. Le catalogue ne part pas vers un serveur.

[Media Cataloger 2](/media-cataloger-2) est la version en cours. Sur macOS : Swift + nmcd et nmcui. Sur Windows et Linux : le build Go. La licence reçue par email se colle dans le téléchargement du 15 octobre. L’application Mac habituelle ne lit pas encore ce fichier. Les zips publics 0.0.1, gratuits et limités à 1 disque, restent sur [Media Cataloger](/media-cataloger).

<a href="/media-cataloger-2" class="btn text-white border border-primary-600/30 bg-primary-600/90 dark:bg-primary-800/80 hover:bg-primary-800 hover:border-primary-800 sm:mb-0 px-8 py-3 w-full rounded-3xl">Voir Media Cataloger 2</a>
