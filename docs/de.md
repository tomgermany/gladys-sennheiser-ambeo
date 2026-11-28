# Sennheiser AMBEO Soundbar

Steuert eine AMBEO Soundbar **Max, Plus oder Mini** über das lokale Netzwerk (ohne Cloud).
Die Plus ist das Referenzmodell; Mini und Max werden auf die gleiche Weise unterstützt.

## Einrichtung

1. Ermittle die IP-Adresse der Soundbar (über die Smart-Control-App oder deinen Router).
2. Trage sie im Bereich **Konfiguration** der Integration ein.
3. Klicke auf **Verbindung testen**: Die Integration fragt die Soundbar ab und zeigt an, was sie zurückmeldet (Modell, Firmware, Anzahl der Eingänge und Lautstärke). Wird ein Fehler gemeldet, ist entweder die Adresse falsch oder die Soundbar ist über Port 80 nicht erreichbar.
4. Starte eine Gerätesuche: Es wird ein Gerät mit allen Einstellungen angelegt, die dein Modell unterstützt.

## Gerätefunktionen

Ein/Aus, Lautstärke, Stummschaltung, Eingang, Klangprofil, Nachtmodus, AMBEO-Modus, Sprachoptimierung, akustische Rückmeldung, Subwoofer, Helligkeit von LED-Leiste/Logo/Display, Bluetooth-Kopplung, Energiesparmodus, Audio-Codec und aktuelle Wiedergabe (nur lesbar).

Plus und Mini stellen zusätzlich die Center-Lautstärke bereit. Die Max bietet stattdessen den AMBEO-Pegel sowie die Pegel für Center-, Seiten- und nach oben abstrahlende Lautsprecher.

Die Ein-/Ausschaltfunktion hängt vom Modell ab: Die Max kann aus dem Standby aufgeweckt und wieder in den Standby versetzt werden. Bei den anderen Modellen wird die entsprechende Schaltfläche im Widget ausgeblendet.

Auch ein Modell, das nicht auf eine ganze Gruppe von Einstellungen antwortet (was bei bestimmten Firmware-Versionen vorkommen kann), wird angelegt. Nicht beantwortete Einstellungen werden protokolliert und übersprungen.

## Widget „Soundbar-Fernbedienung“

Das Widget bietet folgende Bedienelemente:

- Ein-/Ausschalten (nur bei der Max)
- Lautstärke verringern und erhöhen (Schrittweite konfigurierbar)
- Stummschaltung ein-/ausschalten
- Zum nächsten Eingang wechseln

Zusätzlich zeigt das Widget die Lautstärke als Wertkachel und den aktuell ausgewählten Eingang als Text an. Die Schaltfläche zum Wechseln des Eingangs zeigt an, zu welchem Eingang als Nächstes gewechselt wird.

In den Widget-Einstellungen kannst du auswählen, welche Soundbar gesteuert werden soll. Außerdem lassen sich die Lautstärketasten ausblenden.

## Szenen

**Aktion „Soundbar-Status auslesen“** liefert Lautstärke, Stummschaltung, Eingang, Klangprofil und Audio-Codec. Die nachfolgenden Schritte können diese Werte über `{{outputs.<key>}}` auslesen.

**Aktion „Soundbar-Lautstärke einstellen“** setzt eine absolute Lautstärke.

**Auslöser „Lautstärke überschreitet einen Grenzwert“** wird ausgelöst, wenn die Lautstärke den in der Konfiguration festgelegten Grenzwert für „zu laut“ überschreitet oder unter den Grenzwert für „zu leise“ fällt. Der Auslöser stellt die Richtung, den Grenzwert und die neue Lautstärke bereit.

Er wird bei jeder Grenzwertüberschreitung genau einmal ausgelöst. Für eine einfache Bedingung wie „Lautstärke über X“ solltest du stattdessen Gladys' eigenen Auslöser **„Gerätezustand geändert“** für die Lautstärkefunktion verwenden.

## Hinweise

Die API der Soundbar ist nicht offiziell dokumentiert. Die verwendeten API-Pfade orientieren sich an der Open-Source-Bibliothek pyambeo.

## Rechtlicher Hinweis

Dies ist ein unabhängiges, inoffizielles Projekt. Es ist **weder mit Sennheiser electronic SE & Co. KG oder einer ihrer Tochtergesellschaften verbunden noch von ihnen autorisiert, unterstützt oder gesponsert**. Es handelt sich nicht um ein offizielles Sennheiser-Produkt oder einen offiziellen Sennheiser-Dienst.

**Sennheiser** und **AMBEO** sind Marken oder eingetragene Marken der [Sennheiser electronic SE & Co. KG](https://www.sennheiser.com/). Sie werden hier ausschließlich verwendet, um die Hardware zu beschreiben, mit der diese Integration funktioniert. Alle anderen Marken, Produktnamen und Firmennamen sind Eigentum ihrer jeweiligen Inhaber.
