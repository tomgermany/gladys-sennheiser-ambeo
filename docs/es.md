# Sennheiser AMBEO Soundbar

Controla una barra de sonido AMBEO **Max, Plus o Mini** a través de tu red local (sin nube).
La Plus es el modelo de referencia; la Mini y la Max se admiten de la misma forma.

## Puesta en marcha

1. Busca la dirección IP de la barra (app Smart Control o tu router).
2. Introdúcela en la pantalla **Configuración** de la integración.
3. Pulsa **Probar la conexión**: la integración consulta la barra y dice lo que ha
   respondido (modelo, firmware, número de entradas, volumen). Si da error, la
   dirección es incorrecta o no se puede alcanzar la barra en su puerto 80.
4. Lanza una búsqueda de dispositivos: se crea un dispositivo con todos los ajustes
   que admite tu modelo.

## Funciones del dispositivo

Encendido, volumen, silencio, entrada, perfil de sonido, modo noche, modo AMBEO,
mejora de voz, retorno sonoro, altavoz de graves, brillo de LED/logo/pantalla,
emparejamiento Bluetooth, modo eco, códec de audio y reproducción actual (solo lectura).
Las Plus y Mini exponen además el volumen central; la Max expone el nivel AMBEO y los
niveles central/lateral/superior.

El encendido depende del modelo: la Max se puede despertar y poner en espera, el botón
del widget se oculta en los demás modelos.

Un modelo que no responde a todo un grupo de ajustes (algunas versiones de firmware)
aparece igualmente: lo que no responde se registra en el log y se ignora.

## Widget «Mando de la barra de sonido»

El widget muestra el volumen actual y la entrada seleccionada en dos tarjetas de valor.
Sus botones permiten encender/apagar la Max, bajar el volumen (−), subirlo (+), activar
o desactivar el silencio y pasar a la siguiente entrada seleccionable. El botón de
entrada indica cuál será la siguiente. El paso del volumen se puede configurar y los
botones de volumen se pueden ocultar en los ajustes del widget.

En los ajustes del widget también puedes elegir qué barra controla esa tarjeta. Gladys
muestra como máximo cuatro botones: en la Max, los botones de encendido, volumen −/+, y
silencio ocupan los cuatro espacios, por lo que el botón para cambiar de entrada no se
muestra mientras estén activados los botones de volumen. Si ocultas los botones de
volumen, liberas espacio.

## Escenas

**Acción «Leer el estado de la barra de sonido»** devuelve volumen, silencio, entrada,
perfil de sonido y códec, legibles por los pasos siguientes como `{{outputs.<clave>}}`.

**Acción «Ajustar el volumen de la barra»** fija un volumen absoluto.

**Disparador «El volumen cruza un límite»** se activa cuando el volumen supera el límite
de «demasiado alto» o baja del de «demasiado bajo» configurados. Lleva la dirección, el
límite y el nuevo volumen. Se activa una vez por cruce: para una simple condición
«volumen por encima de X», usa el disparador «el estado de un dispositivo cambia» de
Gladys sobre la función de volumen.

## Notas

La API de la barra no está documentada oficialmente; las rutas siguen la biblioteca de
código abierto pyambeo.

## Aviso legal

Este es un proyecto **independiente y no oficial**. **No está afiliado, autorizado,
respaldado ni patrocinado por Sennheiser electronic SE & Co. KG** ni por ninguna de sus
filiales, y no es un producto ni un servicio oficial de Sennheiser.

**Sennheiser** y **AMBEO** son marcas comerciales o marcas registradas de
[Sennheiser electronic SE & Co. KG](https://www.sennheiser.com/), utilizadas aquí
únicamente para describir el hardware con el que funciona esta integración. Todas las
demás marcas, nombres de productos y nombres de empresas pertenecen a sus respectivos
propietarios.
