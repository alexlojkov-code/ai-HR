// Мок-интервьюер без модели (SPEC §3.6): сервер без ключа и демо на GitHub Pages.
// Банк: технический (Frontend) и нетехнический (продажи) набор, RU и UZ.
import { difficultyOf, isTechPosition, totalScore, verdictFor } from './catalog.js';
import { PHRASES, pick } from './phrases.js';

const BANK = {
  tech: [
    { kind: 'tech', ru: ['Разница let, const и var', 'Чем отличаются let, const и var?', ['область видимости: блок или функция', 'всплытие и временная мёртвая зона', 'const нельзя переназначить', 'глобальный var становится свойством window']],
      uz: ['let, const va var farqi', 'let, const va var o‘rtasida qanday farq bor?', ['ko‘rinish sohasi: blok yoki funksiya', 'hoisting va TDZ', 'const qayta tayinlanmaydi', 'global var window xossasiga aylanadi']] },
    { kind: 'tech', ru: ['Замыкания', 'Что такое замыкание? Приведите пример из реальной задачи.', ['функция запоминает лексическое окружение', 'доступ к переменным после завершения внешней функции', 'пример: счётчик, обработчик, фабрика', 'риск утечек памяти']],
      uz: ['Closure', 'Closure (yopilish) nima? Real vazifadan misol keltiring.', ['funksiya leksik muhitni eslab qoladi', 'tashqi funksiya tugagach ham o‘zgaruvchilarga kirish', 'misol: hisoblagich, hodisa ishlovchisi', 'xotira oqishi xavfi']] },
    { kind: 'behavioral', ru: ['Сорванный срок', 'Расскажите о случае, когда вы не успевали к сроку. Что сделали?', ['конкретная ситуация', 'заранее сообщил о риске', 'что упростил или переприоритизировал', 'вывод на будущее']],
      uz: ['Muddat buzilishi', 'Muddatga ulgurmagan holatingiz haqida gapirib bering. Nima qildingiz?', ['aniq vaziyat', 'xavf haqida oldindan xabar berdi', 'nimani soddalashtirdi yoki ustuvorlikni o‘zgartirdi', 'kelajak uchun xulosa']] },
    { kind: 'tech', ru: ['Отрисовка страницы', 'Как браузер отрисовывает страницу после получения HTML?', ['DOM и CSSOM', 'дерево рендера', 'layout (reflow)', 'paint и composite', 'блокирующие скрипты и CSS']],
      uz: ['Sahifani chizish', 'HTML olingandan keyin brauzer sahifani qanday chizadi?', ['DOM va CSSOM', 'render tree', 'layout (reflow)', 'paint va composite', 'bloklovchi skript va CSS']] },
    { kind: 'case', ru: ['Медленная страница', 'Страница интернет-магазина грузится 8 секунд на телефоне. С чего начнёте?', ['замер: Lighthouse, DevTools', 'размер и формат изображений', 'лишний JS, разбиение кода', 'кэширование и CDN', 'приоритет первого экрана']],
      uz: ['Sekin sahifa', 'Internet-do‘kon sahifasi telefonda 8 soniya yuklanmoqda. Nimadan boshlaysiz?', ['o‘lchash: Lighthouse, DevTools', 'rasmlar hajmi va formati', 'ortiqcha JS, code splitting', 'keshlash va CDN', 'birinchi ekran ustuvorligi']] },
    { kind: 'tech', ru: ['Event loop', 'Что такое event loop в JavaScript?', ['стек вызовов', 'очередь макрозадач', 'микрозадачи выполняются раньше', 'рендер между задачами']],
      uz: ['Event loop', 'JavaScript’dagi event loop nima?', ['chaqiruvlar steki', 'makrovazifalar navbati', 'mikrovazifalar oldinroq bajariladi', 'vazifalar orasida render']] },
    { kind: 'behavioral', ru: ['Жёсткое код-ревью', 'Как вы реагируете, когда на код-ревью ваш код разносят?', ['отделяю код от себя', 'уточняю аргументы', 'исправляю или спорю с доводами', 'извлекаю урок']],
      uz: ['Qattiq kod-review', 'Kod-review’da kodingizni qattiq tanqid qilishsa, qanday munosabat bildirasiz?', ['kodni o‘zimdan ajrataman', 'dalillarni aniqlashtiraman', 'tuzataman yoki asosli bahslashaman', 'saboq chiqaraman']] },
    { kind: 'tech', ru: ['Доступность форм', 'Как сделать форму доступной для людей с экранным диктором?', ['label у каждого поля', 'семантические элементы', 'ошибки через aria', 'управление с клавиатуры', 'контраст']],
      uz: ['Formalar qulayligi', 'Screen reader ishlatadigan odamlar uchun formani qanday qulay qilasiz?', ['har bir maydonda label', 'semantik elementlar', 'xatolar aria orqali', 'klaviatura bilan boshqarish', 'kontrast']] },
    { kind: 'case', ru: ['React или чистый JS', 'Для небольшого лендинга нужно выбрать: React или чистый JS. Как решите?', ['размер и сложность проекта', 'вес бандла и скорость', 'команда и поддержка', 'сроки']],
      uz: ['React yoki sof JS', 'Kichik lending uchun React yoki sof JS tanlash kerak. Qanday qaror qilasiz?', ['loyiha hajmi va murakkabligi', 'bandl hajmi va tezlik', 'jamoa va qo‘llab-quvvatlash', 'muddatlar']] },
  ],
  business: [
    { kind: 'behavioral', ru: ['Сложная сделка', 'Расскажите о самой сложной сделке, которую вы закрыли.', ['конкретный клиент и ситуация', 'в чём была сложность', 'ваши действия', 'результат в цифрах']],
      uz: ['Qiyin bitim', 'O‘zingiz yopgan eng qiyin bitim haqida gapirib bering.', ['aniq mijoz va vaziyat', 'qiyinchilik nimada edi', 'sizning harakatlaringiz', 'natija raqamlarda']] },
    { kind: 'tech', ru: ['Возражение «дорого»', 'Клиент говорит: «Дорого». Ваши действия?', ['выяснить, с чем сравнивает', 'вернуть разговор к ценности', 'не давать скидку сразу', 'предложить варианты']],
      uz: ['«Qimmat» e’tirozi', 'Mijoz: «Qimmat», deydi. Nima qilasiz?', ['nima bilan solishtirayotganini aniqlash', 'suhbatni qiymatga qaytarish', 'darhol chegirma bermaslik', 'variantlar taklif qilish']] },
    { kind: 'tech', ru: ['Этапы продажи', 'Из каких этапов состоит ваша продажа?', ['установление контакта', 'выявление потребностей', 'презентация', 'работа с возражениями', 'закрытие и сопровождение']],
      uz: ['Sotuv bosqichlari', 'Sizning sotuvingiz qanday bosqichlardan iborat?', ['aloqa o‘rnatish', 'ehtiyojlarni aniqlash', 'taqdimot', 'e’tirozlar bilan ishlash', 'yopish va kuzatib borish']] },
    { kind: 'case', ru: ['Горящий план', 'План на месяц — 100 млн сумов, к середине месяца у вас 30. Что делаете?', ['анализ воронки', 'приоритет горячих сделок', 'дополнительные касания по базе', 'честный разговор с руководителем']],
      uz: ['Yonayotgan reja', 'Oylik reja — 100 mln so‘m, oy o‘rtasida sizda 30 mln. Nima qilasiz?', ['voronka tahlili', 'issiq bitimlarga ustuvorlik', 'baza bo‘yicha qo‘shimcha aloqalar', 'rahbar bilan ochiq suhbat']] },
    { kind: 'behavioral', ru: ['Отказы', 'Как вы переносите отказы? Расскажите о неделе, когда всё шло плохо.', ['конкретный пример', 'что помогло не выгореть', 'разбор причин', 'что изменил']],
      uz: ['Rad javoblari', 'Rad javoblarini qanday ko‘tarasiz? Hammasi yomon ketgan hafta haqida gapirib bering.', ['aniq misol', 'charchamaslikka nima yordam berdi', 'sabablar tahlili', 'nimani o‘zgartirdi']] },
    { kind: 'tech', ru: ['Работа в CRM', 'Как вы ведёте клиентов в CRM?', ['фиксирую каждое касание', 'задачи и напоминания', 'этапы сделки', 'дисциплина и актуальность']],
      uz: ['CRM bilan ishlash', 'Mijozlarni CRM’da qanday yuritasiz?', ['har bir aloqani qayd etish', 'vazifalar va eslatmalar', 'bitim bosqichlari', 'intizom va dolzarblik']] },
    { kind: 'case', ru: ['Продай ручку', 'Продайте мне эту ручку.', ['вопросы о потребностях', 'выгода, а не характеристики', 'работа с возражением', 'призыв к действию']],
      uz: ['Ruchkani soting', 'Menga shu ruchkani soting.', ['ehtiyoj haqida savollar', 'xususiyat emas, foyda', 'e’tiroz bilan ishlash', 'harakatga chaqiruv']] },
    { kind: 'behavioral', ru: ['Мотивация', 'Что вас мотивирует в продажах, кроме денег?', ['честный ответ', 'связь с работой', 'пример', 'долгосрочная цель']],
      uz: ['Motivatsiya', 'Savdoda sizni puldan tashqari nima rag‘batlantiradi?', ['samimiy javob', 'ish bilan bog‘liqlik', 'misol', 'uzoq muddatli maqsad']] },
    { kind: 'tech', ru: ['Подготовка к встрече', 'Как вы готовитесь к первой встрече с крупным клиентом?', ['изучить компанию и ЛПР', 'цель встречи', 'гипотезы о потребностях', 'вопросы и материалы']],
      uz: ['Uchrashuvga tayyorgarlik', 'Yirik mijoz bilan birinchi uchrashuvga qanday tayyorlanasiz?', ['kompaniya va qaror qabul qiluvchini o‘rganish', 'uchrashuv maqsadi', 'ehtiyojlar haqida farazlar', 'savollar va materiallar']] },
  ],
};

const INTRO = {
  polite: { ru: 'Здравствуйте. Спасибо, что пришли. Начнём.', uz: 'Assalomu alaykum. Kelganingiz uchun rahmat. Boshlaymiz.' },
  rude: { ru: 'Садись. Резюме твоё я видел, впечатлений ноль. Начнём.', uz: 'O‘tir. Rezyumengni ko‘rdim, taassurot nol. Boshlaymiz.' },
};

const TITLE = {
  tech: { ru: 'Техлид команды', uz: 'Jamoa texlidi' },
  business: { ru: 'Руководитель отдела', uz: 'Bo‘lim rahbari' },
};

const REACT = {
  polite: {
    pleased: { ru: ['Хорошо, это полный ответ.', 'Отлично, вы назвали главное.'], uz: ['Yaxshi, bu to‘liq javob.', 'Ajoyib, asosiysini aytdingiz.'] },
    neutral: { ru: ['Понятно. Двигаемся дальше.', 'Принято.'], uz: ['Tushunarli. Davom etamiz.', 'Qabul qilindi.'] },
    displeased: { ru: ['Этого недостаточно.', 'Ответ слишком общий.'], uz: ['Bu yetarli emas.', 'Javob juda umumiy.'] },
    followup: { ru: 'Можете раскрыть подробнее? Приведите пример.', uz: 'Batafsilroq aytib bera olasizmi? Misol keltiring.' },
  },
  rude: {
    pleased: { ru: ['Неожиданно. Похоже, ты не только туториалы смотрел.', 'Ладно, на этот раз почти прилично.'], uz: ['Kutilmagan. Faqat tutorial ko‘rmagan ekansan.', 'Mayli, bu safar deyarli durust.'] },
    neutral: { ru: ['Так себе. Дальше.', 'Средне. Как и ожидалось.'], uz: ['Shunchaki. Davom.', 'O‘rtacha. Kutganimdek.'] },
    displeased: { ru: ['Ты сейчас минуту говорил и ничего не сказал.', 'Слабо. Очень слабо.'], uz: ['Bir daqiqa gapirding-u, hech narsa demading.', 'Bo‘sh. Juda bo‘sh.'] },
    followup: { ru: 'Конкретнее. Пример. Быстро.', uz: 'Aniqroq. Misol. Tez.' },
  },
};

function bankFor(config) {
  return isTechPosition(config) === false ? BANK.business : BANK.tech;
}

function seedFrom(str) {
  let h = 2166136261;
  for (const ch of String(str)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 2 ** 32;
}

export function mockPlan(config) {
  const lang = config.lang;
  const n = difficultyOf(config).questions;
  const bank = bankFor(config);
  const tech = bank === BANK.tech ? 'tech' : 'business';
  const style = config.style === 'rude' ? 'rude' : 'polite';
  return {
    interviewer: { title: TITLE[tech][lang] },
    intro: INTRO[style][lang],
    questions: bank.slice(0, n).map((q, i) => {
      const [topic, text, keyPoints] = q[lang];
      return { id: `q${i + 1}`, kind: q.kind, topic, text, keyPoints };
    }),
  };
}

const stem = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').slice(0, 5);

function coveredPoints(answer, keyPoints) {
  const words = new Set(String(answer).split(/\s+/).map(stem).filter((w) => w.length >= 4));
  return keyPoints.filter((kp) => kp.split(/\s+/).map(stem).some((w) => w.length >= 4 && words.has(w)));
}

export function mockTurn({ config, plan, qIndex, thread, followupsUsed = 0, phase = 'question', toneSoftened = false }) {
  const lang = config.lang;
  const style = toneSoftened ? 'polite' : config.style;
  const last = thread[thread.length - 1]?.text || '';
  const seed = seedFrom(last);
  if (phase === 'closing') {
    return { say: PHRASES.closingBye[style][lang], action: 'finish', mood: 'neutral', swore: false, note: '' };
  }
  const d = difficultyOf(config);
  const q = plan.questions[qIndex];
  const covered = coveredPoints(last, q.keyPoints).length;
  const short = last.length < 60 || last.startsWith('[');
  if (short && followupsUsed < d.followups) {
    if (d.hints && last.startsWith('[')) {
      return { say: PHRASES.hintFallback[lang], action: 'hint', mood: 'neutral', swore: false, note: 'нужна подсказка' };
    }
    return { say: `${pick(REACT[style].displeased[lang], seed)} ${REACT[style].followup[lang]}`, action: 'followup', mood: 'displeased', swore: false, note: 'ответ короткий' };
  }
  const mood = covered >= 2 || last.length > 300 ? 'pleased' : short ? 'displeased' : 'neutral';
  return { say: pick(REACT[style][mood][lang], seed), action: 'next', mood, swore: false, note: mood === 'pleased' ? 'ответил хорошо' : 'ответил средне' };
}

export function mockReview({ config, plan, threads, toneSoftened = false }) {
  const lang = config.lang;
  const style = toneSoftened ? 'polite' : config.style;
  const items = plan.questions.map((q) => {
    const th = threads.find((t) => t.qid === q.id);
    const answer = (th?.turns || []).filter((t) => t.role === 'candidate' && !t.text.startsWith('[')).map((t) => t.text).join(' ');
    const covered = answer ? coveredPoints(answer, q.keyPoints) : [];
    const missed = q.keyPoints.filter((k) => !covered.includes(k));
    const lengthBonus = Math.min(3, Math.floor(answer.length / 120));
    const score = answer ? Math.min(10, Math.round((covered.length / q.keyPoints.length) * 7) + lengthBonus) : 0;
    const reference = lang === 'uz'
      ? `Yaxshi javob quyidagilarni ochib beradi: ${q.keyPoints.join('; ')}. (Demo: haqiqiy namunaviy javobni sun’iy intellekt yozadi.)`
      : `Хороший ответ раскрывает: ${q.keyPoints.join('; ')}. (Демо: настоящий эталон пишет ИИ.)`;
    const why = lang === 'uz'
      ? (answer ? `${q.keyPoints.length} ta asosiy banddan ${covered.length} tasi ochilgan.` : 'Javob berilmagan.')
      : (answer ? `Раскрыто ${covered.length} из ${q.keyPoints.length} ключевых пунктов.` : 'Ответа нет.');
    return { qid: q.id, score, reference, covered, missed, why };
  });
  const total = totalScore(items.map((i) => i.score));
  const verdict = verdictFor(total);
  const characteristic = {
    polite: { ru: 'Кандидат старался. Есть база, но ответам не хватает глубины и примеров.', uz: 'Nomzod harakat qildi. Asos bor, lekin javoblarga chuqurlik va misollar yetishmaydi.' },
    rude: { ru: 'Старался, вижу. Толку пока мало: общие слова вместо примеров. Подтягивай базу.', uz: 'Harakat qilding, ko‘rdim. Foydasi hozircha kam: misol o‘rniga umumiy gaplar. Asosni mustahkamla.' },
  }[style][lang];
  const L = lang === 'uz'
    ? { s: ['Savollarga javob berishga harakat qildi', 'Asosiy tushunchalarni biladi'], g: ['Misollar kam', 'Javoblar yuzaki'], st: ['Asosiy mavzularni takrorlash', 'Javobni STAR usulida tuzish', 'Amaliy misollar tayyorlash'] }
    : { s: ['Старался отвечать на все вопросы', 'Знает базовые понятия'], g: ['Мало примеров из практики', 'Поверхностные ответы'], st: ['Повторить базовые темы', 'Строить ответ по схеме STAR', 'Подготовить примеры из практики'] };
  return { total, verdict, characteristic, strengths: L.s, gaps: L.g, items, study: L.st };
}

