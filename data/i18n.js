/* i18n.js — Vootkit localisation.
 *
 * TWO layers of translation, both required for a real (non-thin) localised page:
 *   1. chrome[locale] — the shared template strings (nav, section headers, FAQ,
 *      trust, footer). Translate once per language.
 *   2. tools[locale][toolId] — each tool's own {name, desc}. This is the bulk of
 *      the work; generate with ChatGPT per the template in docs and drop in here.
 *
 * build.js ONLY generates a localised page for a tool when BOTH its chrome and its
 * per-tool name/desc exist for that locale — never English content under a foreign
 * URL (that would be duplicate/thin content and hurt SEO). English stays at the
 * root as x-default.
 *
 * Adding a language = add a chrome[locale] block + a tools[locale] map. The engine,
 * hreflang, switcher and RTL handling are all automatic.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.VK_I18N = api;
})(typeof window !== "undefined" ? window : globalThis, function () {

  var LOCALES = [
    { code: "es", label: "Español",           dir: "ltr", name: "Spanish" },
    { code: "pt", label: "Português",         dir: "ltr", name: "Portuguese" },
    { code: "fr", label: "Français",          dir: "ltr", name: "French" },
    { code: "de", label: "Deutsch",           dir: "ltr", name: "German" },
    { code: "hi", label: "हिन्दी",             dir: "ltr", name: "Hindi" },
    { code: "id", label: "Bahasa Indonesia",  dir: "ltr", name: "Indonesian" },
    { code: "ar", label: "العربية",           dir: "rtl", name: "Arabic" },
    { code: "ja", label: "日本語",             dir: "ltr", name: "Japanese" }
  ];

  /* ---- chrome: template strings. {name}/{cat}/{count} are filled by build.js ---- */
  var chrome = {
    es: {
      htmlDir: "ltr",
      nav_tools: "Herramientas", nav_pricing: "Precios", nav_features: "Funciones", nav_blog: "Blog", nav_about: "Nosotros", nav_contact: "Contacto",
      cta_pro: "Hazte Pro", skip: "Saltar al contenido",
      badge_local: "funciona en tu dispositivo", badge_net: "usa una API",
      badge_nosignup: "sin registro", badge_nowatermark: "sin marca de agua", badge_free: "5 gratis al día",
      crumb_tools: "Herramientas",
      title_suffix: "Herramienta de {cat} online y gratuita | Vootkit",
      meta_desc: "{desc} {mode}, sin marca de agua, 5 usos gratis al día.",
      mode_local: "Funciona en tu navegador", mode_net: "Sin registro",
      sec_what: "Qué hace {name}", sec_why: "Por qué usar esta", sec_how: "Cómo funciona", sec_faq: "Preguntas frecuentes", sec_next: "Siguiente en {cat}",
      what_body: "{desc} Es una de las {count} herramientas del ecosistema Vootkit, creada para hacer una sola tarea bien: ábrela, obtén tu resultado y sigue.",
      why_local_b: "No se sube nada.", why_local_d: "Tu archivo se procesa en tu propio dispositivo, así que nunca viaja a un servidor.",
      why_net_b: "Sin necesidad de cuenta.", why_net_d: "Úsala al instante: sin registro y sin correo.",
      why_free_b: "5 usos gratis al día.", why_free_d: "El plan gratuito incluye 5 usos al día — pásate a Pro para uso ilimitado.",
      why_watermark_b: "Sin marca de agua.", why_watermark_d: "Lo que obtienes es exactamente lo que creaste.",
      why_mobile_b: "Funciona en el móvil.", why_mobile_d: "La misma herramienta, cómoda con el pulgar.",
      how1: "Abre {name} — no hay nada que instalar.",
      how2_local: "Añade tu archivo o datos. Se quedan en tu dispositivo.", how2_net: "Escribe lo que quieres consultar.",
      how3: "Ajusta las opciones según el resultado que necesites.", how4: "Descarga o copia tu resultado.",
      faq1_q: "¿Es {name} gratis?", faq1_a: "Sí. El plan gratuito de Vootkit incluye 5 usos al día, sin cuenta y sin marca de agua. Pásate a Vootkit Pro para uso diario ilimitado, procesamiento más rápido y herramientas premium.",
      faq2_q: "¿Se suben mis archivos?", faq2_a_local: "No. {name} funciona por completo en tu navegador: tu archivo se procesa en tu propio dispositivo y nunca se envía a un servidor.", faq2_a_net: "{name} necesita internet, así que llama a un servicio externo para obtener datos. No requiere cuenta y no te rastrea.",
      faq3_q: "¿Necesito instalar algo?", faq3_a: "No. {name} funciona en cualquier navegador moderno de escritorio, tablet o móvil. Abre la página y empieza.",
      faq4_q: "¿Con qué frecuencia puedo usarla? ¿Hay un límite diario?", faq4_a: "En el plan gratuito tienes 5 usos al día. Al llegar al límite verás un aviso para mejorar tu plan, y se reinicia al día siguiente. Vootkit Pro elimina el límite por completo.",
      trust_local: "Esta herramienta procesa todo localmente en tu navegador. Puedes desconectarte de internet tras cargar la página y seguirá funcionando.",
      trust_net: "Esta herramienta llama a un servicio externo para obtener datos en vivo. No requiere cuenta y no te rastrea.",
      foot_how: "Cómo funciona", foot_how_body: "La mayoría de las herramientas funcionan por completo en tu navegador, así que tus archivos no se suben y no hay cola. El plan gratuito incluye 5 usos al día.",
      lang_label: "Idioma"
    },
    pt: {
      nav_tools: "Ferramentas", nav_pricing: "Preços", nav_features: "Recursos", nav_blog: "Blog", nav_about: "Sobre", nav_contact: "Contato",
      cta_pro: "Obter Pro", skip: "Ir para o conteúdo",
      badge_local: "funciona no seu dispositivo", badge_net: "usa uma API",
      badge_nosignup: "sem cadastro", badge_nowatermark: "sem marca d'água", badge_free: "5 usos grátis por dia",
      crumb_tools: "Ferramentas",
      title_suffix: "Ferramenta Online Gratuita de {cat} | Vootkit",
      meta_desc: "{desc} {mode}, sem marca d'água, 5 usos grátis por dia.",
      mode_local: "Funciona no seu navegador", mode_net: "Sem cadastro",
      sec_what: "O que {name} faz", sec_why: "Por que usar esta ferramenta", sec_how: "Como funciona", sec_faq: "Perguntas frequentes", sec_next: "Próximas em {cat}",
      what_body: "{desc} É uma das {count} ferramentas do ecossistema Vootkit, criada para fazer uma única tarefa com excelência — abra, obtenha o resultado e continue.",
      why_local_b: "Nada é enviado.", why_local_d: "Seu arquivo é processado no seu próprio dispositivo, por isso nunca chega a um servidor.",
      why_net_b: "Sem necessidade de conta.", why_net_d: "Use imediatamente — sem cadastro e sem e-mail.",
      why_free_b: "5 usos grátis por dia.", why_free_d: "O plano gratuito inclui 5 usos de ferramentas por dia — faça upgrade para o Pro e tenha uso diário ilimitado.",
      why_watermark_b: "Sem marca d'água.", why_watermark_d: "O resultado final é exatamente o que você criou.",
      why_mobile_b: "Funciona no celular.", why_mobile_d: "A mesma ferramenta, otimizada para toque.",
      how1: "Abra {name} — nada para instalar.", how2_local: "Adicione seu arquivo ou entrada. Tudo permanece no seu dispositivo.", how2_net: "Digite o que deseja pesquisar.", how3: "Ajuste as opções para obter o resultado que precisa.", how4: "Baixe ou copie seu resultado.",
      faq1_q: "{name} é grátis?", faq1_a: "Sim. O plano gratuito do Vootkit inclui 5 usos de ferramentas por dia, sem conta e sem marca d'água. Faça upgrade para o Vootkit Pro para uso diário ilimitado, processamento mais rápido e ferramentas premium.",
      faq2_q: "Meus arquivos são enviados?", faq2_a_local: "Não. {name} funciona totalmente no seu navegador — seu arquivo é processado no próprio dispositivo e nunca é enviado para um servidor.", faq2_a_net: "{name} precisa da internet para funcionar, então utiliza um serviço externo para buscar dados. Não exige conta e não rastreia você.",
      faq3_q: "Preciso instalar alguma coisa?", faq3_a: "Não. {name} funciona em qualquer navegador moderno no computador, tablet ou celular. Abra a página e comece.",
      faq4_q: "Com que frequência posso usar? Existe limite diário?", faq4_a: "No plano gratuito você recebe 5 usos de ferramentas por dia. Quando atingir o limite, verá uma opção para fazer upgrade e o limite será renovado no dia seguinte. O Vootkit Pro remove o limite completamente.",
      trust_local: "Esta ferramenta processa tudo localmente no seu navegador. Você pode desconectar da internet depois que a página carregar e ela continuará funcionando.",
      trust_net: "Esta ferramenta utiliza um serviço externo para buscar dados em tempo real. Não exige conta e não rastreia você.",
      foot_how: "Como funciona", foot_how_body: "A maioria das ferramentas funciona totalmente no seu navegador, então seus arquivos não são enviados e não existe fila de espera. O plano gratuito inclui 5 usos de ferramentas por dia.",
      lang_label: "Idioma"
    }
  };

  /* ---- per-tool name + description. Seed set for Spanish (top tools). ---- */
  var tools = {
    es: {
      "merge-pdf": { name: "Unir PDF", desc: "Combina varios PDF en un solo archivo, reordena páginas — todo en tu dispositivo." },
      "compress-pdf": { name: "Comprimir PDF", desc: "Reduce el tamaño de un PDF manteniendo una buena calidad." },
      "split-pdf": { name: "Dividir PDF", desc: "Separa un PDF en varios archivos por rango de páginas." },
      "pdf-to-jpg": { name: "PDF a JPG", desc: "Convierte cada página de un PDF en una imagen JPG." },
      "jpg-to-pdf": { name: "JPG a PDF", desc: "Convierte tus imágenes en un único PDF ordenado." },
      "compress-image": { name: "Comprimir imagen", desc: "Reduce el peso de una imagen sin perder calidad visible." },
      "resize-image": { name: "Redimensionar imagen", desc: "Cambia el tamaño de una imagen a los píxeles exactos que necesites." },
      "convert-image": { name: "Convertir imagen", desc: "Convierte entre PNG, JPG y WebP en tu navegador." },
      "compress-for-discord": { name: "Comprimir vídeo para Discord", desc: "Ajustes de un clic para 10 MB, 50 MB y 500 MB que sí caben." },
      "video-to-gif": { name: "Vídeo a GIF", desc: "Convierte un clip corto en un GIF con buena paleta de color." },
      "url-shortener": { name: "Acortador de URL", desc: "Convierte un enlace largo en un enlace corto para compartir, con nombre personalizado opcional." },
      "qr-generator": { name: "Generador de códigos QR", desc: "Crea un código QR para cualquier enlace, texto o wifi." },
      "password-generator": { name: "Generador de contraseñas", desc: "Crea contraseñas fuertes y aleatorias al instante." },
      "word-counter": { name: "Contador de palabras", desc: "Cuenta palabras, caracteres y frases mientras escribes." },
      "json-formatter": { name: "Formateador de JSON", desc: "Formatea, valida y minimiza JSON con detección de errores." },
      "mortgage-calculator": { name: "Calculadora de hipoteca", desc: "Cuota mensual, interés total y tabla de amortización completa." },
      "color-converter": { name: "Convertidor de color", desc: "HEX, RGB, HSL y OKLCH con vista previa en vivo." }
    },
    pt: {
      "merge-pdf": { name: "Juntar PDF", desc: "Combine vários PDFs em um único arquivo e reordene páginas — tudo no seu dispositivo." },
      "compress-pdf": { name: "Comprimir PDF", desc: "Reduza o tamanho de um PDF mantendo boa qualidade." },
      "split-pdf": { name: "Dividir PDF", desc: "Separe um PDF em vários arquivos por intervalo de páginas." },
      "pdf-to-jpg": { name: "PDF para JPG", desc: "Converta cada página de um PDF em uma imagem JPG." },
      "jpg-to-pdf": { name: "JPG para PDF", desc: "Converta suas imagens em um único PDF organizado." },
      "compress-image": { name: "Comprimir imagem", desc: "Reduza o peso de uma imagem sem perda visível de qualidade." },
      "resize-image": { name: "Redimensionar imagem", desc: "Altere o tamanho de uma imagem para os pixels exatos que precisar." },
      "convert-image": { name: "Converter imagem", desc: "Converta entre PNG, JPG e WebP no seu navegador." },
      "compress-for-discord": { name: "Comprimir vídeo para o Discord", desc: "Predefinições de um clique para 10 MB, 50 MB e 500 MB que realmente cabem." },
      "video-to-gif": { name: "Vídeo para GIF", desc: "Converta um clipe curto em um GIF com paleta de cores nítida." },
      "url-shortener": { name: "Encurtador de URL", desc: "Transforme um link longo em um link curto para compartilhar, com nome personalizado opcional." },
      "qr-generator": { name: "Gerador de QR Code", desc: "Crie um QR code para qualquer link, texto ou wi-fi." },
      "password-generator": { name: "Gerador de senhas", desc: "Crie senhas fortes e aleatórias na hora." },
      "word-counter": { name: "Contador de palavras", desc: "Conte palavras, caracteres e frases enquanto digita." },
      "json-formatter": { name: "Formatador de JSON", desc: "Formate, valide e minifique JSON com detecção de erros." },
      "mortgage-calculator": { name: "Calculadora de financiamento", desc: "Parcela mensal, juros totais e tabela de amortização completa." },
      "color-converter": { name: "Conversor de cores", desc: "HEX, RGB, HSL e OKLCH com pré-visualização ao vivo." }
    }
  };

  return { LOCALES: LOCALES, chrome: chrome, tools: tools };
});
