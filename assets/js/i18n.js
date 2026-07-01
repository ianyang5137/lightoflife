if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

const resetTopOnPlainPageLoad = () => {
  if (!window.location.hash) {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }
};

const keepPlainPageLoadAtTop = () => {
  resetTopOnPlainPageLoad();
  requestAnimationFrame(resetTopOnPlainPageLoad);
  window.setTimeout(resetTopOnPlainPageLoad, 80);
  window.setTimeout(resetTopOnPlainPageLoad, 260);
};

keepPlainPageLoadAtTop();
window.addEventListener("load", keepPlainPageLoadAtTop);
window.addEventListener("pageshow", keepPlainPageLoadAtTop);

const translations = {
  "zh-Hant": {
    "top.service": "主日崇拜 · 每週日下午 3:30",
    "top.location": "Auckland, New Zealand",
    "brand.title": "生命之光靈糧堂",
    "brand.subtitle": "Light of Life Church Auckland",
    "nav.about": "關於我們",
    "nav.services": "聚會時間",
    "nav.new": "新朋友",
    "nav.messages": "信息讀經",
    "nav.updates": "服事代禱",
    "nav.giving": "奉獻",
    "nav.contact": "聯絡",
    "hero.eyebrow": "Auckland · Mandarin Christian Church",
    "hero.title": "紐西蘭奧克蘭<br />生命之光靈糧堂",
    "hero.copy": "在基督裡遇見生命之光，一同敬拜、成長，成為彼此扶持的屬靈家庭。",
    "hero.primary": "我是新朋友",
    "hero.secondary": "查看聚會時間",
    "welcome.kicker": "Welcome Home",
    "welcome.title": "歡迎來到生命之光",
    "welcome.copy": "無論你是初次認識信仰、剛搬到奧克蘭，或正在尋找一間在奧克蘭中區的華人教會，我們都歡迎你來到生命之光靈糧堂。教會位於 Mount Eden，服事周邊華人家庭、學生、新移民與慕道朋友。",
    "welcome.copy2": "我們以中文敬拜、聖經教導、小組聚會、兒童主日學與團契生活，一同在基督裡敬拜、讀經、禱告，並在真實的群體中成長。",
    "about.kicker": "About Us",
    "about.title": "一間在奧克蘭服事華人社群的教會",
    "about.copy1": "生命之光靈糧堂盼望成為一個以基督為中心、以聖經為根基、以愛彼此連結的屬靈家庭。",
    "about.copy2": "我們重視敬拜、真理、禱告、門徒訓練與社區關懷，也期待不同年齡和背景的人都能在這裡被接納、被建造、被差遣。",
    "services.kicker": "Gatherings",
    "services.title": "聚會時間",
    "services.copy": "歡迎你在主日與我們一同敬拜，也可以先聯絡鴻基牧師了解新朋友接待安排。",
    "services.sunday.title": "主日崇拜",
    "services.sunday.time": "每週日下午 3:30",
    "services.sunday.desc": "詩歌敬拜、聖經信息、禱告與團契。",
    "services.group.title": "小組聚會",
    "services.group.time": "主日證道後 · 教會場地",
    "services.group.desc": "證道後分組分享信息、交流生活近況，彼此代禱與扶持。",
    "services.children.title": "兒童主日學",
    "services.children.time": "主日崇拜期間",
    "services.children.desc": "透過聖經小故事、詩歌、手作與陪伴，幫助孩子從小認識神的話語，在愛與真理中成長。",
    "new.kicker": "New Here",
    "new.title": "第一次來，也可以很安心",
    "new.step1.title": "聚會語言",
    "new.step1.copy": "以中文為主，英文朋友也歡迎參與。",
    "new.step2.title": "抵達之後",
    "new.step2.copy": "接待同工會協助你找到座位、了解聚會流程。",
    "new.step3.title": "孩子與父母",
    "new.step3.copy": "孩子可以參加兒童主日學，在同工陪伴中聽聖經故事、活動與玩耍；父母也可以更安心地專心參與崇拜和聽道。",
    "new.link": "聯絡我們安排第一次到訪",
    "ministries.kicker": "Ministries",
    "ministries.title": "一起敬拜、成長、服事",
    "ministries.worship.title": "敬拜與信息",
    "ministries.worship.copy": "以詩歌、禱告與聖經真理回應神的恩典。",
    "ministries.discipleship.title": "門徒成長",
    "ministries.discipleship.copy": "透過課程、小組與陪伴，在信仰和生命中成熟。",
    "ministries.community.title": "社區關懷",
    "ministries.community.copy": "以實際行動關心新移民、家庭、學生與城市需要。",
    "messages.kicker": "Messages & News",
    "messages.title": "主日信息與線上讀經",
    "messages.copy": "透過 YouTube 收看主日信息，也歡迎每週在線上一同讀經、思想神的話語。",
    "messages.button": "在線觀看",
    "giving.kicker": "Giving",
    "giving.title": "奉獻",
    "giving.copy": "若你願意以奉獻支持教會事工，請使用以下銀行帳戶資料。",
    "giving.note": "轉帳時可於 Reference 填寫姓名或奉獻用途。",
    "giving.account.label": "奉獻帳戶名",
    "giving.account.value": "Bread of Life Christian Church Light of Life",
    "giving.asb.label": "ASB銀行帳號",
    "giving.asb.value": "12-3016-0054058-00",
    "giving.fund.label": "殖堂基金帳號",
    "giving.fund.value": "12-3016-0054058-50",
    "contact.kicker": "Contact",
    "contact.title": "聯絡我們",
    "contact.copy": "歡迎聯絡我們了解聚會、探訪、小組或新朋友接待。",
    "contact.address.label": "地址",
    "contact.address.value": "72 View Road, Mount Eden, Auckland 1024",
    "contact.pastor.label": "聯絡人",
    "contact.pastor.value": "鴻基牧師",
    "contact.email.label": "Email",
    "contact.phone.label": "電話",
    "contact.button": "發送 Email",
    "contact.mapButton": "開啟地圖",
    "footer.name": "紐西蘭奧克蘭生命之光靈糧堂",
    "footer.youtube": "YouTube 頻道",
    "footer.zoom": "Zoom （842 707 8200）",
    "footer.copy": "© 2026 Light of Life, Bread of Life Christian Church in Auckland, New Zealand."
  },
  en: {
    "top.service": "Sunday Service · Sundays at 3:30 PM",
    "top.location": "Auckland, New Zealand",
    "brand.title": "Light of Life Church",
    "brand.subtitle": "Bread of Life Christian Church Auckland",
    "nav.about": "About",
    "nav.services": "Gatherings",
    "nav.new": "New Here",
    "nav.messages": "Messages",
    "nav.updates": "Updates",
    "nav.giving": "Giving",
    "nav.contact": "Contact",
    "hero.eyebrow": "Auckland · Mandarin Christian Church",
    "hero.title": "Light of Life,<br />Bread of Life Christian Church",
    "hero.copy": "Encountering the light of life in Christ as we worship, grow, and become a spiritual family that supports one another.",
    "hero.primary": "I am new",
    "hero.secondary": "View gathering times",
    "welcome.kicker": "Welcome Home",
    "welcome.title": "Welcome to Light of Life",
    "welcome.copy": "Whether you are exploring faith, new to Auckland, or looking for a Chinese church in central Auckland, you are welcome at Light of Life Church. We are located in Mount Eden and serve Chinese families, students, new migrants, and friends exploring faith across nearby communities.",
    "welcome.copy2": "We gather for Mandarin worship, biblical teaching, small group gatherings, Children's Sunday School, and fellowship as we worship, pray, study Scripture, and grow together in Christ.",
    "about.kicker": "About Us",
    "about.title": "A church serving the Chinese community in Auckland",
    "about.copy1": "Light of Life, Bread of Life Christian Church seeks to be a Christ-centred, Bible-grounded spiritual family connected by love.",
    "about.copy2": "We value worship, truth, prayer, discipleship, and care for the community, welcoming people of different ages and backgrounds to be received, built up, and sent out.",
    "services.kicker": "Gatherings",
    "services.title": "Gathering Times",
    "services.copy": "You are welcome to worship with us on Sundays. You can also contact Pastor Hongji before your first visit.",
    "services.sunday.title": "Sunday Service",
    "services.sunday.time": "Sundays at 3:30 PM",
    "services.sunday.desc": "Worship, biblical teaching, prayer, and fellowship.",
    "services.group.title": "Small Group Gathering",
    "services.group.time": "After the Sunday message · At church",
    "services.group.desc": "After the message, we gather in groups to reflect, share life updates, and pray for one another.",
    "services.children.title": "Children's Sunday School",
    "services.children.time": "During Sunday Service",
    "services.children.desc": "Through Bible stories, songs, activities, and caring guidance, children are helped to know God's Word and grow in love and truth.",
    "new.kicker": "New Here",
    "new.title": "Feel at ease on your first visit",
    "new.step1.title": "Language",
    "new.step1.copy": "Our gatherings are mainly in Chinese, and English-speaking friends are also welcome.",
    "new.step2.title": "When you arrive",
    "new.step2.copy": "Our welcome team can help you find a seat and understand the flow of the service.",
    "new.step3.title": "Children and parents",
    "new.step3.copy": "Children can join Children's Sunday School, where caring helpers guide them through Bible stories, activities, and play, so parents can worship and listen to the message with greater peace of mind.",
    "new.link": "Contact us before your first visit",
    "ministries.kicker": "Ministries",
    "ministries.title": "Worship, grow, and serve together",
    "ministries.worship.title": "Worship and Teaching",
    "ministries.worship.copy": "Responding to God's grace through songs, prayer, and biblical truth.",
    "ministries.discipleship.title": "Discipleship",
    "ministries.discipleship.copy": "Growing in faith and life through classes, groups, and spiritual care.",
    "ministries.community.title": "Community Care",
    "ministries.community.copy": "Serving new migrants, families, students, and the needs of the city in practical ways.",
    "messages.kicker": "Messages & News",
    "messages.title": "Messages and Online Bible Reading",
    "messages.copy": "Watch Sunday messages on YouTube, and join us online each week to read and reflect on God's Word together.",
    "messages.button": "Watch on YouTube",
    "giving.kicker": "Giving",
    "giving.title": "Giving",
    "giving.copy": "If you would like to support the ministry of the church through giving, please use the bank details below.",
    "giving.note": "For bank transfers, you may include your name or giving purpose in the reference.",
    "giving.account.label": "Account name",
    "giving.account.value": "Bread of Life Christian Church Light of Life",
    "giving.asb.label": "ASB account number",
    "giving.asb.value": "12-3016-0054058-00",
    "giving.fund.label": "Church planting fund account",
    "giving.fund.value": "12-3016-0054058-50",
    "contact.kicker": "Contact",
    "contact.title": "Contact Us",
    "contact.copy": "Contact us to learn more about gatherings, visits, home groups, or first-time guest care.",
    "contact.address.label": "Address",
    "contact.address.value": "72 View Road, Mount Eden, Auckland 1024",
    "contact.pastor.label": "Contact",
    "contact.pastor.value": "Pastor Hongji",
    "contact.email.label": "Email",
    "contact.phone.label": "Phone",
    "contact.button": "Send Email",
    "contact.mapButton": "Open Map",
    "footer.name": "Light of Life, Bread of Life Christian Church in Auckland, New Zealand",
    "footer.youtube": "YouTube Channel",
    "footer.zoom": "Zoom （842 707 8200）",
    "footer.copy": "© 2026 Light of Life, Bread of Life Christian Church in Auckland, New Zealand."
  }
};

const setLanguage = (lang) => {
  const dictionary = translations[lang] || translations["zh-Hant"];
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (dictionary[key]) {
      element.textContent = dictionary[key];
    }
  });
  document.querySelectorAll("[data-i18n-html]").forEach((element) => {
    const key = element.getAttribute("data-i18n-html");
    if (dictionary[key]) {
      element.innerHTML = dictionary[key];
    }
  });
  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === lang);
  });
};

const getPathLanguage = () => {
  const normalizedPath = window.location.pathname.replace(/\/+$/, "");
  return normalizedPath === "/en" || normalizedPath.startsWith("/en/") ? "en" : "zh-Hant";
};

setLanguage(getPathLanguage());

document.querySelectorAll("[data-lang]").forEach((button) => {
  button.addEventListener("click", () => {
    window.location.href = button.dataset.lang === "en" ? "/en/" : "/";
  });
});

const menuButton = document.querySelector("[data-menu-button]");
const primaryNav = document.querySelector("[data-primary-nav]");

menuButton.addEventListener("click", () => {
  const isOpen = primaryNav.classList.toggle("open");
  document.body.classList.toggle("menu-open", isOpen);
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

primaryNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    primaryNav.classList.remove("open");
    document.body.classList.remove("menu-open");
    menuButton.setAttribute("aria-expanded", "false");
  });
});

const sectionLinks = Array.from(primaryNav.querySelectorAll('a[href^="#"]'));
const observedSections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const setActiveNav = (id) => {
  sectionLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
  });
};

if ("IntersectionObserver" in window) {
  const navObserver = new IntersectionObserver(
    (entries) => {
      const visibleEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visibleEntry) {
        setActiveNav(visibleEntry.target.id);
      }
    },
    {
      rootMargin: "-35% 0px -50% 0px",
      threshold: [0.1, 0.35, 0.6]
    }
  );

  observedSections.forEach((section) => navObserver.observe(section));
} else {
  const updateActiveNav = () => {
    let currentSection = null;
    for (const section of observedSections) {
      if (section.getBoundingClientRect().top <= 180) {
        currentSection = section;
      }
    }
    if (currentSection) {
      setActiveNav(currentSection.id);
    }
  };
  window.addEventListener("scroll", updateActiveNav, { passive: true });
  updateActiveNav();
}

document.querySelectorAll("[data-updates-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.updatesTab;
    document.querySelectorAll("[data-updates-tab]").forEach((button) => {
      const isActive = button.dataset.updatesTab === target;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
    document.querySelectorAll("[data-updates-panel]").forEach((panel) => {
      const isActive = panel.dataset.updatesPanel === target;
      panel.classList.toggle("active", isActive);
      panel.hidden = !isActive;
    });
  });
});

const backToTopButton = document.querySelector("[data-back-to-top]");

const toggleBackToTop = () => {
  backToTopButton.classList.toggle("visible", window.scrollY > 420);
};

backToTopButton.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

window.addEventListener("scroll", toggleBackToTop, { passive: true });
toggleBackToTop();
