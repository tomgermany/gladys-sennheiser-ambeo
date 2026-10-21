# Sennheiser AMBEO Soundbar

Pilote une barre de son AMBEO **Max, Plus ou Mini** sur votre réseau local (sans cloud).
La Plus est le modèle de référence ; la Mini et la Max sont prises en charge de la même façon.

## Mise en route

1. Trouvez l'adresse IP de la barre (app Smart Control ou routeur).
2. Saisissez-la dans l'écran **Configuration** de l'intégration.
3. Lancez une recherche d'appareils : un appareil avec tous les réglages de votre modèle est créé.

## Fonctions de l'appareil

Marche/arrêt, volume, sourdine, entrée, profil sonore, mode nuit, mode AMBEO, amélioration
des voix, retour sonore, caisson de basses, luminosité LED/logo/écran, appairage Bluetooth,
mode éco, codec audio et lecture en cours (lecture seule). Les Plus et Mini exposent en plus
le volume central ; la Max expose le niveau AMBEO et les niveaux centre/latéral/haut.

La marche/arrêt dépend du modèle : la Max peut être réveillée et mise en veille, le bouton
du widget est masqué sur les autres modèles.

## Widget « Télécommande barre de son »

Marche/arrêt, volume −/+ (pas configurable), sourdine et un bouton par entrée sélectionnable.

## Scènes

**Action « Jouer un son sur la barre de son »** joue un MP3 ou WAV :

- **Fichier du dossier « sounds »** : l'intégration sert le fichier elle-même et la barre
  le récupère. Ouvrez le port « sounds » de l'intégration depuis l'écran Applications,
  déposez-y vos MP3 ou WAV, puis choisissez-le dans l'action (laissez le nom vide pour
  utiliser le son par défaut de la configuration). Un son d'exemple de trois secondes
  (`tone.wav`) est livré avec l'intégration.
- **URL http(s)** : un lien direct vers le fichier, joignable par la barre.

Le champ **volume** optionnel règle le volume avant la lecture.

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
open source pyambeo. La lecture d'un fichier n'est pas encore vérifiée sur un appareil.
