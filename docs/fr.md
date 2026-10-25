# Sennheiser AMBEO Soundbar

Pilote une barre de son AMBEO **Max, Plus ou Mini** sur votre réseau local (sans cloud).
La Plus est le modèle de référence ; la Mini et la Max sont prises en charge de la même façon.

## Mise en route

1. Trouvez l'adresse IP de la barre (app Smart Control ou routeur).
2. Saisissez-la dans l'écran **Configuration** de l'intégration.
3. Appuyez sur **Tester la connexion** : l'intégration interroge la barre et dit ce
   qu'elle a répondu (modèle, firmware, nombre d'entrées, volume). En cas d'erreur,
   l'adresse est fausse ou la barre n'est pas joignable sur son port 80.
4. Lancez une recherche d'appareils : un appareil avec tous les réglages de votre modèle est créé.

## Fonctions de l'appareil

Marche/arrêt, volume, sourdine, entrée, profil sonore, mode nuit, mode AMBEO, amélioration
des voix, retour sonore, caisson de basses, luminosité LED/logo/écran, appairage Bluetooth,
mode éco, codec audio et lecture en cours (lecture seule). Les Plus et Mini exposent en plus
le volume central ; la Max expose le niveau AMBEO et les niveaux centre/latéral/haut.

La marche/arrêt dépend du modèle : la Max peut être réveillée et mise en veille, le bouton
du widget est masqué sur les autres modèles.

Un modèle qui ne répond pas à tout un groupe de réglages (certaines versions de firmware)
apparaît quand même : ce qu'il ne répond pas est journalisé et ignoré.

## Widget « Télécommande barre de son »

Marche/arrêt, volume −/+ (pas configurable), sourdine et un bouton par entrée sélectionnable.

## Scènes

**Action « Lire l'état de la barre de son »** renvoie volume, sourdine, entrée, profil
sonore et codec, lisibles par les étapes suivantes via `{{outputs.<clé>}}`.

**Action « Régler le volume de la barre »** règle un volume absolu.

**Déclencheur « Le volume franchit une limite »** se déclenche quand le volume passe
au-dessus de la limite « trop fort » ou en dessous de la limite « trop faible » de la
configuration. Il porte le sens, la limite et le nouveau volume. Il se déclenche une fois
par franchissement : pour une simple condition « volume au-dessus de X », utilisez le
déclencheur « l'état d'un appareil change » de Gladys sur la fonction volume.

## Remarques

L'API de la barre n'est pas documentée officiellement ; les chemins suivent la bibliothèque
open source pyambeo.

## Mention légale

Ce projet est **indépendant et non officiel**. Il **n'est ni affilié, ni autorisé, ni
approuvé, ni sponsorisé par Sennheiser electronic SE & Co. KG** ni par aucune de ses
filiales : ce n'est pas un produit ni un service officiel de Sennheiser.

**Sennheiser** et **AMBEO** sont des marques ou des marques déposées de
[Sennheiser electronic SE & Co. KG](https://www.sennheiser.com/), utilisées ici uniquement
pour décrire le matériel avec lequel cette intégration fonctionne. Toutes les autres
marques, noms de produits et noms de sociétés appartiennent à leurs propriétaires
respectifs.
