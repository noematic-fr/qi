---
title: DiskShelf
subtitle: Vos disques sur une étagère — montés ou au coffre
pubDate: 2026-09-11
isPaid: true
pricing: building
showSupportLink: false
platforms:
  - macOS
  - Windows
  - Linux
mainLinks:
  "Nous écrire": "mailto:contact@noematic.eu?subject=DiskShelf"
links:
  "Media Cataloger (0.0.1)": "https://qi.noematic.fr/media-cataloger"
---

<div class="mb-6 rounded-2xl border border-sky-600/40 bg-sky-50 px-5 py-4 text-sky-950 dark:border-sky-400/30 dark:bg-sky-950/40 dark:text-sky-100">
  <p class="m-0 font-medium">Media Cataloger s’appelle DiskShelf</p>
  <p class="mt-2 mb-0 text-sm opacity-90">
    Même catalogue, nouveau nom. <strong>Toute demande de licence, et toute licence déjà envoyée</strong> (beta 0.2 par email), reste valable — Mac (Swift + nmcui) <em>et</em> le build Go Windows / Linux.
    Les zips publics 0.0.1 restent sur <a href="/media-cataloger">Media Cataloger</a> jusqu’à un zip DiskShelf.
  </p>
</div>

DiskShelf répertorie vos disques dans un catalogue local. Une fois un volume indexé, vous parcourez son contenu, cherchez des fichiers et voyez qui prend de la place — même quand le disque n’est plus branché. Ce n’est pas un DAM, pas un lecteur iTunes, pas un éditeur EXIF : une étagère.

Sur **macOS**, deux applications, un moteur : **Swift + nmcd** (app native) et **nmcui** (Go / Fyne). Sur **Windows** et **Linux**, c’est le build Go. Une licence ouvre les trois.

### Fonctionnalités

#### Accès à la structure de disque, locale et hors ligne

Même déconnecté, vous consultez l’arborescence, les dates de modification et les tailles.

#### Vue instantanée du disque

Espace libre d’un coup d’œil, y compris les volumes locaux et distants.

#### Visualiser la consommation de l’espace

Voyez quels dossiers et fichiers occupent le plus de place, pour décider ce qu’il faut garder.

#### Recherche de fichiers

Par nom ou par extension, sur tous les disques catalogués — connectés ou non.

#### Cataloguer des disques de n’importe où avec SSH

Via le protocole Secure Shell, depuis un ordinateur distant.

#### Détection de fichiers dupliqués

Copies sur le même disque ou entre plusieurs disques.

#### Listes de duplicatas personnalisables

Par sujet, propriétaire, ou le critère que vous choisissez.

#### Recherche de fichiers uniques

Les fichiers qui n’existent que sur un seul disque.

#### Suppression des doublons inutiles

Faire de la place en retirant les copies en trop.

#### Optimisé pour les multi-processeurs

L’indexation parcourt les dossiers en parallèle, pour les catalogues volumineux.

<div id="newsletter">

<script async data-uid="15784f62e4" src="https://noematic.kit.com/15784f62e4/index.js"></script>

</div>

<a href="mailto:contact@noematic.eu?subject=DiskShelf" class="btn text-white border border-primary-600/30 bg-primary-600/90 dark:bg-primary-800/80 hover:bg-primary-800 hover:border-primary-800 sm:mb-0 px-8 py-3 w-full rounded-3xl">Nous écrire</a>

### Questions fréquentes {#faq}

#### DiskShelf ou Media Cataloger ?

**Un produit.** DiskShelf est le nom. Media Cataloger est la vitrine des zips publics **0.0.1** (Mac Intel, Windows, Linux) tant qu’il n’y a pas de zip DiskShelf. Ce n’est pas une deuxième app à acheter.

#### J’ai déjà une licence Media Cataloger (beta 0.2 par email) ?

Oui. Les licences **déjà envoyées** et **toute nouvelle demande** ouvrent DiskShelf. Même fichier de licence. Ce n’est pas réservé aux demandes d’après le changement de nom.

#### Ça marche sur Windows et Linux, ou seulement le Swift Mac ?

Les deux. La licence vaut pour le **build Go** (nmcui) sur Windows, Linux et Mac, pas seulement pour l’app Swift macOS. Les zips Go 0.0.1 sont encore sur <a href="/media-cataloger">Media Cataloger</a>.

#### Deux apps sur Mac ?

Oui : **Swift + nmcd** (native) et **nmcui** (Go / Fyne). Même moteur, même licence.

#### Est-ce open source ?

Certaines parties. DiskShelf est une app desktop Noematic.

#### Faut-il internet ?

Non pour cataloguer, chercher et voir les doublons. Tout reste sur votre machine.
