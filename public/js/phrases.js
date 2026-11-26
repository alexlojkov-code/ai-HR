// Заготовленные реплики интервьюера: «Не знаю» без запроса к модели (SPEC §3.5),
// запасные грубые реплики при блокировке фильтром (SPEC §3.3), вопрос «вопросы к нам».
// Мата здесь нет. UZ — черновик, вычитывает носитель.

export const PHRASES = {
  skip: {
    polite: {
      ru: ['Хорошо, перейдём к следующему вопросу.', 'Понимаю. Двигаемся дальше.', 'Ничего страшного. Следующий вопрос.', 'Принято. Идём дальше.'],
      uz: ['Yaxshi, keyingi savolga o‘tamiz.', 'Tushunarli. Davom etamiz.', 'Hechqisi yo‘q. Keyingi savol.', 'Qabul qilindi. Davom etamiz.'],
    },
    rude: {
      ru: ['Честно. Бесполезно, но честно. Дальше.', 'Не знаешь. Так и запишу: «пустое место». Следующий.', 'Отличный ответ для человека, который пришёл не на то собеседование. Дальше.', 'Ну хоть время сэкономил. Мне — нет. Следующий вопрос.'],
      uz: ['Rostgo‘y ekansan. Foydasiz, lekin rostgo‘y. Davom.', 'Bilmaysan. Shunday yozib qo‘yaman: «bo‘sh joy». Keyingisi.', 'Boshqa suhbatga adashib kelgan odam uchun zo‘r javob. Davom.', 'Hech bo‘lmasa vaqtni tejading. Meni emas. Keyingi savol.'],
    },
  },
  blocked: {
    ru: ['Даже комментировать это не буду. Дальше.', 'Слабо. Очень слабо. Следующий вопрос.', 'Я ожидал хоть чего-то. Зря. Дальше.', 'Это был ответ? Ладно, идём дальше.', 'Запишу как «мимо». Следующий.', 'С таким ответом я бы тебя и на стажировку не взял. Дальше.', 'Мда. Двигаемся, пока я не уснул.', 'Ты сам-то понял, что сказал? Следующий вопрос.', 'Ноль конкретики. Дальше.', 'Пропущу это мимо ушей. Следующий.'],
    uz: ['Buni izohlab ham o‘tirmayman. Davom.', 'Bo‘sh. Juda bo‘sh. Keyingi savol.', 'Hech bo‘lmasa nimadir kutgandim. Bekor ekan. Davom.', 'Bu javobmidi? Mayli, davom etamiz.', '«Yo‘q» deb yozib qo‘yaman. Keyingisi.', 'Bunday javob bilan seni stajirovkaga ham olmasdim. Davom.', 'Hm. Uxlab qolmasimdan davom etamiz.', 'O‘zing nima deganingni tushundingmi? Keyingi savol.', 'Hech qanday aniqlik yo‘q. Davom.', 'Buni eshitmaganga olaman. Keyingisi.'],
  },
  closingAsk: {
    polite: { ru: 'Спасибо, вопросы у меня закончились. У вас есть вопросы к нам?', uz: 'Rahmat, mening savollarim tugadi. Sizda bizga savollar bormi?' },
    rude: { ru: 'Всё, хватит. Вопросы ко мне есть? Только быстро.', uz: 'Bo‘ldi, yetar. Menga savoling bormi? Faqat tezroq.' },
  },
  closingBye: {
    polite: { ru: 'Спасибо за время. Результаты — в досье.', uz: 'Vaqtingiz uchun rahmat. Natijalar — hujjatda.' },
    rude: { ru: 'Всё, свободен. Досье сейчас принесут — не обольщайся.', uz: 'Bo‘ldi, ketishing mumkin. Hujjatni hozir olib kelishadi — ko‘p umid qilma.' },
  },
  hintFallback: {
    ru: 'Подумайте, с чего обычно начинают в такой ситуации, и опишите первый шаг.',
    uz: 'Bunday vaziyatda odatda nimadan boshlanishini o‘ylab ko‘ring va birinchi qadamni ayting.',
  },
};

export function pick(list, seed = Math.random()) {
  return list[Math.floor(seed * list.length) % list.length];
}

// Технический маркер «Не знаю», который уходит в модель и в досье.
export const SKIP_MARK = { ru: '[кандидат не знает ответа]', uz: '[nomzod javobni bilmaydi]' };
