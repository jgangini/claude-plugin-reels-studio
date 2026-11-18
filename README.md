# Reels Studio

Un plugin de Claude para hacer vídeos explicativos en tu ordenador.

## Para qué sirve

Le das una idea y te acompaña hasta el vídeo terminado: guion, voz, animación, subtítulos, portada y el texto para
publicarlo. Tú decides en cada paso y lo publicas tú.

Hace tres tipos de vídeo, cada uno pensado para su canal:

| Formato | Para | Tamaño |
|---|---|---|
| Reel | Instagram, TikTok y YouTube Shorts | 1080×1920 |
| YouTube | Vídeos de varios minutos | 1920×1080 |
| LinkedIn | Vídeos para el feed | 1080×1080 |

## Requisitos

- La app de Claude (Claude Code).
- Una clave de [OpenRouter](https://openrouter.ai) con saldo, para la voz. Un vídeo cuesta céntimos.
- Node 20 o más, ffmpeg y git. Si falta alguno, la IA lo instala al configurarte.

## Instalación

En cualquier conversación de Claude:

```
/plugin marketplace add jgangini/claude-plugin-reels-studio
/plugin install reels@reels-studio
```

## Primeros pasos

1. Abre una **carpeta vacía** en Claude y escribe:

   ```
   configúrame
   ```

   La IA descarga el taller en esa carpeta, instala lo que falte y te pregunta tu idioma, tu marca y la voz que
   quieres. La primera vez tarda unos minutos.

2. Se abrirá una página en tu navegador para tu clave de OpenRouter (se saca en openrouter.ai/keys). Pégala ahí. Se
   guarda solo en tu ordenador y nunca pasa por el chat.

## Cómo se usa

Pide el vídeo con tus palabras, en la carpeta de tu taller:

```
Hazme un reel que explique por qué el cielo es azul
```

```
Hazme un vídeo de YouTube que explique cómo funciona este repositorio: https://github.com/usuario/proyecto
```

La IA te irá parando para que decidas, siempre en el chat:

1. la idea y el canal;
2. el guion;
3. cómo se va a ver;
4. el principio, ya animado;
5. las escenas, una por una: dices cuáles aceptas y qué cambiarías;
6. la portada, entre tres;
7. el vídeo terminado;
8. el título y el texto para publicarlo.

Contesta con tus palabras o con una captura marcada. Si quieres cambiar algo, dilo en cuanto lo veas.

Al terminar, el vídeo está en la carpeta `salida/` de tu taller, con su portada y su texto para publicar.

## Consejos

- Un vídeo por conversación: para el siguiente, abre una conversación nueva en la misma carpeta.
- `proyectos/ejemplo/` es un vídeo pequeño ya hecho, por si quieres ver uno antes de pedir el tuyo.
- Si algo falla, escribe `doctor`: la IA revisa qué falta y lo arregla.
- Para tener la última versión, escribe `actualiza el taller`.

## Licencia

[MIT](LICENSE). Los créditos de terceros están en [CREDITOS.md](CREDITOS.md).
