# Funktionen des Geräts in Gladys

Gegenüberstellung aller Funktionen, die die Integration als Gladys-Gerät anlegt,
aufgeteilt in **steuerbare** und **reine Anzeigen**.

Grundlage: `src/devices/soundbar.js`. Referenzmodell ist die **AMBEO Soundbar Plus**
(Firmware 1.0.134). Die Liste wird zur Laufzeit aus dem erzeugt, was die Soundbar
tatsächlich beantwortet — ein Modell, das etwas nicht kennt, bekommt die Funktion
gar nicht erst angezeigt.

Zählung: **22 steuerbare Funktionen, 3 reine Anzeigen.** Auf einem Plus sind davon
20 sichtbar, weil sechs Funktionen nur die Max kennt.

## Steuerbar / änderbar

### Ein/Aus-Schalter

| Funktion | Bedeutung |
| --- | --- |
| Power | Nur beim **Max**. Beim Plus und Mini schreibgeschützt, weil die Firmware keinen Weckbefehl kennt. |
| Mute | Stummschaltung, unabhängig von der Quelle. |
| Night mode | Nachtmodus, dämpft die tiefen Töne. |
| AMBEO mode | Der AMBEO-3D-Effekt, an oder aus. |
| Voice enhancement | Sprachverständlichkeit, an oder aus. |
| Sound feedback | Bestätigungston der Soundbar, an oder aus. |
| Subwoofer | Subwoofer aktiv oder inaktiv. |
| AMBEO logo | Die beleuchtete AMBEO-Schrift, an oder aus. |
| Bluetooth pairing | Bluetooth-Kopplungsmodus, an oder aus. |

### Schieberegler

| Funktion | Bedeutung |
| --- | --- |
| Volume | Gesamtlautstärke, 0 bis 100. |
| Voice enhancement level | Stufe der Sprachoptimierung. |
| Subwoofer volume | Pegel des Subwoofers. |
| Center volume | Pegel des Center-Kanals (Plus und Mini). |
| Center speaker level | Pegel des Center-Lautsprechers (nur Max). |
| Side firing level | Pegel der seitlichen Lautsprecher (nur Max). |
| Up firing level | Pegel der nach oben strahlenden (nur Max). |
| LED bar brightness | Helligkeit der Statusleuchte. |
| Codec LED brightness | Helligkeit der Format-Anzeige. |
| Logo brightness | Helligkeit der AMBEO-Schrift. |
| Display brightness | Helligkeit des Displays (nur Max). |

### Auswahlliste

| Funktion | Bedeutung |
| --- | --- |
| Input | Der Eingang. Beim Testgerät sieben Stück, inklusive Spotify Connect. Die Liste kommt vom Gerät, nicht aus dem Code. |
| Sound profile | Das Klangprofil: Music, Movie, News, Sports, Neutral, Adaptive. |
| AMBEO level | Light, Regular, Boost. Nur beim **Max**. |

## Nur Information (schreibgeschützt)

Diese drei Werte lassen sich nur lesen. Sie erscheinen im Gerät ohne Bedienelement
und in der Werteliste mit dem Hinweis „nur lesen".

| Funktion | Bedeutung |
| --- | --- |
| Eco mode | Ob die Soundbar im Energiesparmodus ist. Das Gerät schaltet das selbst. |
| Audio codec | Das gerade dekodierte Format, z. B. Dolby Atmos, PCM, DTS. Es hängt vom laufenden Signal ab. |
| Now playing | Titel und Interpret des laufenden Inhalts. Meist leer bei HDMI und optisch, gefüllt bei Streaming. |

## Nur für den Max

Diese sechs Funktionen kennt nur die Max. Auf einem Plus oder Mini erscheinen sie
gar nicht, weil die Soundbar sie nicht beantwortet.

| Funktion | Bedeutung |
| --- | --- |
| Power | Ein- und Ausschalten über die Integration. |
| AMBEO level | Light, Regular, Boost. |
| Center speaker level | Pegel des Center-Lautsprechers. |
| Side firing level | Pegel der seitlichen Lautsprecher. |
| Up firing level | Pegel der nach oben strahlenden. |
| Display brightness | Helligkeit des Displays. |

## Was das Widget zusätzlich kann

Das Widget zeigt dieselben Werte, aber mit einer Auswahl an Knöpfen. Eine
Dashboard-Kachel nimmt höchstens vier Knöpfe an, deshalb sind es genau vier:

| Knopf | Wirkung |
| --- | --- |
| Quieter | Eine Stufe leiser, Schrittweite aus der Konfiguration. |
| Louder | Eine Stufe lauter. |
| Mute / Unmute | Stummschaltung umschalten. |
| Input: *Name* | Schaltet zum nächsten Eingang in der Liste, die die Soundbar meldet. |

Dazu zwei Anzeigen: die Lautstärke als Live-Kachel und der aktuelle Eingang als
Textzeile. Die Lautstärkeknöpfe lassen sich in den Widget-Einstellungen abschalten.

Nicht im Widget, nur im Gerät oder in der Konfiguration:

- Power, beim Max.
- Sound profile, AMBEO mode, Night mode und alle Pegel.
