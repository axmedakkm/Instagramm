import type { Language } from "@/store/useLanguageStore";

/** The languages offered in Settings → Language, in display order. */
export const LANGUAGES: { code: Language; nativeLabel: string }[] = [
  { code: "en", nativeLabel: "English" },
  { code: "ru", nativeLabel: "Русский" },
  { code: "tg", nativeLabel: "Тоҷикӣ" },
];

/**
 * Translation dictionaries. Each language is a flat map from a dotted key to
 * its text. To add a string: add the key to `en` (the fallback), then to the
 * other languages. To translate a new screen, wrap its text in `t("key")`.
 */
type Dict = Record<string, string>;

const en: Dict = {
  "common.back": "Go back",

  "nav.home": "Home",
  "nav.search": "Search",
  "nav.explore": "Explore",
  "nav.reels": "Reels",
  "nav.messages": "Messages",
  "nav.notifications": "Notifications",
  "nav.create": "Create",
  "nav.profile": "Profile",
  "nav.more": "More",

  "auth.loginTagline": "Welcome back — sign in to pick up where you left off.",
  "auth.signupTagline": "Sign up to see photos and videos from your friends.",
  "auth.emailOrUsername": "Email or username",
  "auth.password": "Password",
  "auth.login": "Log in",
  "auth.signup": "Sign up",
  "auth.fullName": "Full name",
  "auth.username": "Username",
  "auth.email": "Email",
  "auth.noAccount": "Don't have an account?",
  "auth.haveAccount": "Have an account?",
  "auth.loginSuccess": "Welcome back!",
  "auth.invalidCreds": "Invalid credentials. Please try again.",
  "auth.registerSuccess": "Account created! Welcome to Instagramm.",
  "auth.registerError": "Couldn't create your account. Please try again.",

  "settings.title": "Settings",
  "settings.editProfile": "Edit profile",
  "settings.saved": "Saved",
  "settings.theme": "Theme",
  "settings.language": "Language",
  "settings.privacy": "Account privacy",
  "settings.blocked": "Blocked accounts",
  "settings.archive": "Story archive",
  "settings.hideStory": "Hide story from",
  "settings.logout": "Log out",

  "theme.title": "Theme",
  "theme.darkMode": "Dark mode",
  "theme.darkModeDesc":
    "Switch the app between the light and dark colour scheme.",

  "language.title": "Language",
  "language.desc": "Choose the language used across the app.",
};

const ru: Dict = {
  "common.back": "Назад",

  "nav.home": "Главная",
  "nav.search": "Поиск",
  "nav.explore": "Обзор",
  "nav.reels": "Reels",
  "nav.messages": "Сообщения",
  "nav.notifications": "Уведомления",
  "nav.create": "Создать",
  "nav.profile": "Профиль",
  "nav.more": "Ещё",

  "auth.loginTagline": "С возвращением — войдите, чтобы продолжить.",
  "auth.signupTagline":
    "Зарегистрируйтесь, чтобы смотреть фото и видео друзей.",
  "auth.emailOrUsername": "Эл. почта или имя пользователя",
  "auth.password": "Пароль",
  "auth.login": "Войти",
  "auth.signup": "Зарегистрироваться",
  "auth.fullName": "Полное имя",
  "auth.username": "Имя пользователя",
  "auth.email": "Эл. почта",
  "auth.noAccount": "Нет аккаунта?",
  "auth.haveAccount": "Уже есть аккаунт?",
  "auth.loginSuccess": "С возвращением!",
  "auth.invalidCreds": "Неверные данные. Попробуйте снова.",
  "auth.registerSuccess": "Аккаунт создан! Добро пожаловать в Instagramm.",
  "auth.registerError": "Не удалось создать аккаунт. Попробуйте снова.",

  "settings.title": "Настройки",
  "settings.editProfile": "Редактировать профиль",
  "settings.saved": "Сохранённое",
  "settings.theme": "Тема",
  "settings.language": "Язык",
  "settings.privacy": "Конфиденциальность",
  "settings.blocked": "Заблокированные аккаунты",
  "settings.archive": "Архив историй",
  "settings.hideStory": "Скрыть историю от",
  "settings.logout": "Выйти",

  "theme.title": "Тема",
  "theme.darkMode": "Тёмная тема",
  "theme.darkModeDesc": "Переключение между светлой и тёмной темой.",

  "language.title": "Язык",
  "language.desc": "Выберите язык приложения.",
};

const tg: Dict = {
  "common.back": "Бозгашт",

  "nav.home": "Асосӣ",
  "nav.search": "Ҷустуҷӯ",
  "nav.explore": "Кашф",
  "nav.reels": "Reels",
  "nav.messages": "Паёмҳо",
  "nav.notifications": "Огоҳиҳо",
  "nav.create": "Эҷод",
  "nav.profile": "Профил",
  "nav.more": "Бештар",

  "auth.loginTagline": "Хуш омадед — ворид шавед, то корро идома диҳед.",
  "auth.signupTagline": "Барои дидани акс ва видеои дӯстон бақайдгирӣ кунед.",
  "auth.emailOrUsername": "Почтаи электронӣ ё номи корбарӣ",
  "auth.password": "Парол",
  "auth.login": "Ворид шудан",
  "auth.signup": "Бақайдгирӣ",
  "auth.fullName": "Номи пурра",
  "auth.username": "Номи корбарӣ",
  "auth.email": "Почтаи электронӣ",
  "auth.noAccount": "Ҳисоб надоред?",
  "auth.haveAccount": "Ҳисоб доред?",
  "auth.loginSuccess": "Хуш омадед!",
  "auth.invalidCreds": "Маълумот нодуруст аст. Аз нав кӯшиш кунед.",
  "auth.registerSuccess": "Ҳисоб сохта шуд! Хуш омадед ба Instagramm.",
  "auth.registerError": "Ҳисоб сохта нашуд. Аз нав кӯшиш кунед.",

  "settings.title": "Танзимот",
  "settings.editProfile": "Таҳрири профил",
  "settings.saved": "Захирашуда",
  "settings.theme": "Намуд",
  "settings.language": "Забон",
  "settings.privacy": "Махфият",
  "settings.blocked": "Аккаунтҳои басташуда",
  "settings.archive": "Бойгонии сторис",
  "settings.hideStory": "Пинҳон кардани сторис аз",
  "settings.logout": "Баромадан",

  "theme.title": "Намуд",
  "theme.darkMode": "Ҳолати торик",
  "theme.darkModeDesc": "Гузариш байни намуди равшан ва торик.",

  "language.title": "Забон",
  "language.desc": "Забони барномаро интихоб кунед.",
};

export const messages: Record<Language, Dict> = { en, ru, tg };
