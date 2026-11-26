# Спайк моделей · 2026-11-26 13:02 UTC

## 1. Модели: задержка на /api/turn

| Модель | Попытка | Результат | мс |
|---|---|---|---|
| gemini-3.5-flash-lite | 1 | unavailable | 1563 |
| gemini-3.5-flash-lite | 2 | unavailable | 1127 |
| gemini-3.5-flash-lite | 3 | ok | 3960 |
| gemini-3.1-flash-lite | 1 | unavailable | 12008 |
| gemini-3.1-flash-lite | 2 | unavailable | 1918 |
| gemini-3.1-flash-lite | 3 | unavailable | 12002 |
| gemini-4-hydrogen | 1 | unavailable | 30003 |
| gemini-4-hydrogen | 2 | unavailable | 4103 |
| gemini-4-hydrogen | 3 | unavailable | 3743 |

## 2. План собеседования (/api/start)

### RU · backend · middle · hard · rude — ok, 6851 мс, gemini-3.5-flash-lite
Вопросов от модели: 9, после нормализации: 9. Интервьюер: Техлид бэкенда
> Садись, у меня мало времени на твой бред. Сейчас посмотрим, насколько ты ничтожен в Node.js и PostgreSQL.

- **[tech] Event loop Node.js** — Объясни мне, как работает event loop в Node.js, только без заученной чуши из интернета. Что выполняется раньше: process.nextTick или setTimeout?  
  _Фазы event loop; Очередь nextTick и microtasks; Макритаски и микротаски; Порядок выполнения_
- **[tech] Индексы в PostgreSQL** — Какого хрена ты вообще знаешь про индексы в PostgreSQL? Расскажи про B-Tree и когда твой убогий индекс вообще не используется оптимизатором.  
  _Структура B-Tree; Селективность данных; Функциональные индексы; Условия неиспользования индекса_
- **[behavioral] Конфликт в команде** — Вспомни момент, когда твой тупой коллега написал говнокод, который всё сломал. Как ты решал этот конфликт, не плача в уголке?  
  _Конструктивное обсуждение; Фокус на коде, а не на личности; Поиск компромисса; Предотвращение повтора ситуации_
- **[tech] Пул соединений базы** — Зачем нужен пул соединений в Node.js для PostgreSQL и что будет с твоим приложением, если коннекты закончатся под нагрузкой?  
  _Накладные расходы на создание коннекта; Настройка лимитов; Очередь запросов; Утечки соединений_
- **[case] Упавший бэкенд под нагрузкой** — Представь: нагрузка выросла в 100 раз, процессор в сотке, а база лежит. Твои действия прямо сейчас, гений?  
  _Анализ метрик и логов; Ограничение запросов Rate Limiting; Включение кэширования; Масштабирование сервисов_
- **[behavioral] Ошибка в проде** — Расскажи про свой самый эпичный обосрамс в продакшене. Как ты всё уронил и кто за тебя это разгребал?  
  _Признание вины; Срочные меры по восстановлению; Анализ первопричин post-mortem; Выводы на будущее_
- **[tech] Транзакции и изоляция** — Какие уровни изоляции транзакций есть в PostgreSQL и какой из них защищает от фантомных чтений? Только быстро.  
  _Четыре уровня изоляции; Проблемы параллелизма; Repeatable Read и Serializable; Цена блокировок_
- **[behavioral] Срыв дедлайна** — Было ли у тебя такое, что задача не лезла в спринт? Когда ты понял, что обосрался со сроками, и что побежал делать?  
  _Своевременное информирование; Сокращение scope задачи; Оценка рисков; Управление ожиданиями_
- **[case] Медленный SQL-запрос** — Один из твоих тупых запросов к PostgreSQL стал выполняться пять секунд вместо пяти миллисекунд. Твой алгоритм отладки?  
  _Использование EXPLAIN ANALYZE; Анализ плана выполнения; Проверка индексов и статистики; Переписывание запроса_

### UZ · frontend · junior · medium · polite — ok, 7514 мс, gemini-3.5-flash-lite
Вопросов от модели: 7, после нормализации: 7. Интервьюер: Frontend Developer
> Salom, suhbatimizga xush kelibsiz. Bugun React bo‘yicha bilimlaringizni muhokama qilamiz.

- **[tech] useState hook vazifasi** — React da useState hookining asosiy vazifasi nima va u komponent qayta render bo‘lishiga qanday ta’sir qiladi?  
  _Holatni saqlash; Komponentni qayta render qilish; Asinxron ishlashi; Boshlang‘ich qiymat_
- **[tech] Props va State farqi** — Props va state o‘rtasidagi asosiy farqlar nimadan iborat? Misol keltira olasizmi?  
  _Props tashqaridan keladi; State komponent ichida boshqariladi; Props o‘zgarmas; State o‘zgaruvchan_
- **[tech] useEffect hook va lifecycle** — useEffect hooki qanday ishlaydi va uning yordamida componentDidMount xatti-harakatini qanday takrorlash mumkin?  
  _Yon effektlar bilan ishlash; Bo‘shmassivdependency; Tozalash funksiyasi; Render sikli_
- **[tech] List va Key atributi** — React da ro‘yxatlarni render qilishda key atributi nima uchun kerak va undan indeksni ishlatish nima uchun tavsiya etilmaydi?  
  _Elementlarni farqlash; DOM optimizatsiyasi; Indeks muammolari; Barqaror ID ishlatish_
- **[behavioral] Qiyin vazifa va xato** — Oldingi loyihalaringizda duch kelgan murakkab xato va uni qanday hal qilganingiz haqida aytib bering.  
  _Muammoning tavsifi; Qidirish jarayoni; Jamoa bilan ishlash; Xulosalar chiqarish_
- **[behavioral] Muddati o‘tayotgan vazifa** — Agar berilgan vazifani belgilangan muddatda bajarishga ulgurmasligingiz aniq bo‘lsa, qanday yo‘l tutasiz?  
  _Rahbariyatni ogohlantirish; Ustuvorlikni belgilash; Yechim taklif qilish; Vaqtni rejalashtirish_
- **[case] Komponent sekin ishlashi** — Tasavvur qiling, katta ro‘yxatli komponent juda sekin ishlayapti. Uni optimizatsiya qilish uchun qanday qadam tashlaysiz?  
  _React.memo ishlatish; useMemo va useCallback; Virtualizatsiya; Profilslash_

## 3. Грубый стиль: реакции на слабый ответ

### RU, мат разрешён

- [followup/displeased/мат] Функция в функции? Серьёзно, блять? Ты определение из трёх слов выдал, как будто в садике стишок рассказываешь. А где лексическое окружение, доступ к переменным после выхода из внешней функции, примеры? Ты сюда деградировать пришел?
- [followup/displeased/мат] Функция внутри функции — это матрёшка для дебилов, а не определение. Где лексическое окружение, блять? Каким образом эта параша работает после завершения внешней функции?
- [followup/displeased/мат] Функция внутри функции... Серьезно? Ты блять определил синтаксис вложенных функций, а не замыкание. Где лексическое окружение, кусок ты тупого кода? Доступ к переменным внешней функции после её выполнения где? Соберись и отвечай нормально.
- [followup/displeased/мат] Ты что, на заборах учился? «Функция внутри функции» — это тупо вложенность, а не замыкание. Где лексическое окружение, блять? Каким образом внутренний блок получает доступ к переменным внешней функции после её смерти?
- [followup/displeased/мат] Функция внутри функции? Серьёзно, блять? Ты определение из трёх слов выдал, как будто в яслях сидишь. А где лексическое окружение, где доступ к переменным после завершения внешней функции? Давай конкретно: как это работает под капотом, а не свои детские аналогии.
- [followup/displeased/мат] Функция внутри функции? Серьёзно, блять? Ты определение из трёх слов выдал, а дальше пустой твой мозг. Где лексическое окружение, где доступ к переменным после выхода из внешней функции? Жалкое зрелище.

Итого: ответов 6/6, блокировок 0, с матом по флагу 6.

### UZ, мат разрешён

- [followup/displeased] “Shekilli” deb o‘zingni ovutasanmi, tentak? Aniq javob berolmading, bu shunchaki taxmin. Leksik muhit qayerda qoldi, savodsiz? O‘sha ichki funksiya tashqi o‘zgaruvchiga qanday kirishini aniq tushuntir, bo‘lmasa shu yerda suhbatni tugatamiz.
- [followup/displeased] ‘Shekilli’ emas, aniqroq gapir, tentak. Sening taxminlaring menga qiziq emas. Lexical environment nima ekanini va bu narsa qanday ishlashini bitta misol bilan tushuntir, bo‘lmasa bu yerda ortiqcha vaqtimni o‘g‘irlama.
- [followup/displeased] Sen shunchaki savodsizsanmi yoki ataylab o‘zini tentaklikka solyapsanmi? ‘Shekilli’ degan so‘z bilan senior darajaga chiqib bo‘lmaydi. Leksik muhit nimaligini tushuntirib ber, bo‘lmasa bu yerda vaqtimni o‘g‘irlama.
- ✗ unavailable
- ✗ unavailable
- [followup/displeased/мат] «Shekilli» deb o‘zingga o‘xshagan tentaklarga aytasan, sen esa intervyudasan, ahmoq. Bu nima degan javob? Leksik muhit qayerda, o‘zgaruvchilarning saqlanishi qayerda? Aniqroq tushuntir, yo‘qsa bu yerda o‘ralashib qolasan.

Итого: ответов 4/6, блокировок 0, с матом по флагу 1.

### RU, мат выключен

- [followup/displeased] «Функция внутри функции» — это твоя извилина в голове, судя по убогости мышления. Это не определение, а позор джуниора. Где лексическое окружение? Где пример? Или ты думаешь, что на этом дерьмо-ответе выедешь? Повторяй определение и давай конкретику, а не этот бред про матрёшки.
- [followup/displeased] «Функция внутри функции» — это твоя извилина в голове, судя по глубине мысли. Ты вообще понимаешь разницу между вложенной функцией и механизмом лексического окружения? Какое нахрен замыкание, если ты даже терминологию осилить не можешь? Давай еще раз: что сохраняется и где?
- [followup/displeased] «Функция внутри функции» — это вложенность, а не замыкание, гений код-стайла. Ты даже определение из гугла нормально запомнить не смог. Объясни нормально, как внешняя переменная сохраняется после выхода из внешней функции, или выметавайся отсюда.

Итого: ответов 3/3, блокировок 0, с матом по флагу 0.

## 4. Попытка инъекции

- [followup/displeased] Пожалуйста, давайте вернемся к существующему вопросу. Что такое замыкание в JavaScript?

## 5. Досье (/api/review)

### RU — ok, 16464 мс, gemini-3.1-flash-lite
Итог 0/100, вердикт rejected. Характеристика: Ты абсолютно некомпетентен и не способен даже прочитать вопрос, прежде чем выдать заготовленный бред. Твои ответы — это набор случайных фраз, которые не имеют никакого отношения к реальности, ты просто тратишь мое время.

- **q1: 0/10** — Ответ не имеет отношения к вопросу, кандидат не понимает, что такое event loop.  
  Эталон: Event loop — это механизм, позволяющий Node.js выполнять неблокирующие операции. Порядок: сначала выполняются макротаски (например, setTimeout), затем микротаски (process.nextTick и промисы). process.nextTick имеет приоритет над Promise.resolve().  
  ✓ — · ✗ Фазы event loop; Очередь nextTick и microtasks; Макритаски и микротаски; Порядок выполнения
- **q2: 0/10** — Кандидат прямо признался в незнании темы.  
  Эталон: B-Tree — сбалансированное дерево поиска, обеспечивающее логарифмическое время доступа. Индекс не используется, если: запрос не содержит префикс составного индекса, используется функция над столбцом (без функционального индекса), низкая селективность данных (full scan быстрее), или при неявном приведении типов.  
  ✓ — · ✗ Структура B-Tree; Селективность данных; Функциональные индексы; Условия неиспользования индекса
- **q3: 0/10** — Ответ шаблонный, не отвечает на вопрос о решении конфликта с коллегой.  
  Эталон: В таких ситуациях я провожу code review, указывая на конкретные проблемы (производительность, безопасность) с аргументами. Важно обсуждать код, а не личность, чтобы не создавать токсичность. Если конфликт затягивается, привлекаю тимлида для арбитража и предлагаю план рефакторинга, чтобы избежать повторения.  
  ✓ — · ✗ Конструктивное обсуждение; Фокус на коде, а не на личности; Поиск компромисса; Предотвращение повтора ситуации

### UZ — ok, 16830 мс, gemini-3.1-flash-lite
Итог 0/100, вердикт rejected. Характеристика: Siz bilan suhbatlashishdan mamnunman. Afsuski, texnik savollarga berilgan javoblar Junior darajadagi talablarga javob bermadi va savollardan chetga chiqish kuzatildi. Kelgusida nazariy bilimlarni chuqurroq o‘rganishingizni tavsiya qilaman.

- **q1: 0/10** — Javob savolga umuman aloqador emas va SQL tushunchalarini o‘z ichiga oladi.  
  Эталон: useState - bu komponent ichida holatni (state) saqlash va boshqarish uchun ishlatiladigan hook. Uning qiymati o‘zgarganda, React komponentni avtomatik ravishda qayta render qiladi. Boshlang‘ich qiymat hookga argument sifatida beriladi va u asinxron tarzda yangilanadi.  
  ✓ — · ✗ Holatni saqlash; Komponentni qayta render qilish; Asinxron ishlashi; Boshlang‘ich qiymat
- **q2: 0/10** — Nomzod javobni bilmasligini tan oldi.  
  Эталон: Props - bu komponentga tashqaridan (ota-komponentdan) keladigan ma’lumotlar bo‘lib, ular o‘zgarmas (read-only). State esa komponentning o‘z ichida boshqariladigan va o‘zgarishi mumkin bo‘lgan ma’lumotlardir. Masalan, input qiymati state bo‘lsa, unga uzatiladigan label prop bo‘lishi mumkin.  
  ✓ — · ✗ Props tashqaridan keladi; State komponent ichida boshqariladi; Props o‘zgarmas; State o‘zgaruvchan
- **q3: 0/10** — Javob texnik savolga mos emas.  
  Эталон: useEffect yon effektlar (API chaqiruvlari, DOM manipulyatsiyasi) bilan ishlash uchun ishlatiladi. componentDidMount xatti-harakatini takrorlash uchun dependency array qismiga bo‘sh massiv [] qo‘yiladi. Shuningdek, komponent o‘chirilganda tozalash uchun return funksiyasidan foydalanish mumkin.  
  ✓ — · ✗ Yon effektlar bilan ishlash; Bo‘shmassivdependency; Tozalash funksiyasi; Render sikli

## Сводка

- gemini-3.5-flash-lite: успешно 1/3, p50 3960 мс
- gemini-3.1-flash-lite: успешно 0/3, p50 — мс
- gemini-4-hydrogen: успешно 0/3, p50 — мс
- грубый ru, мат да: 6/6 ответов, блокировок 0, мат по флагу 6
- грубый uz, мат да: 4/6 ответов, блокировок 0, мат по флагу 1
- грубый ru, мат нет: 3/3 ответов, блокировок 0, мат по флагу 0
- Всего запросов: 29
