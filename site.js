(function () {
  const root = document.documentElement;

  window.addEventListener("pointermove", (event) => {
    root.style.setProperty("--mx", `${event.clientX}px`);
    root.style.setProperty("--my", `${event.clientY}px`);
  });

  function setText(selector, value) {
    const target = document.querySelector(selector);
    if (target) target.textContent = value;
  }

  function updateGrowthPie() {
    const inputs = Array.from(document.querySelectorAll("[data-pie-input]"));
    const pie = document.querySelector("[data-growth-pie]");
    if (!inputs.length || !pie) return;
    const values = inputs.map((input) => Number(input.value));
    const total = values.reduce((sum, value) => sum + value, 0) || 1;
    let cursor = 0;
    const colors = ["#5cc7ff", "#785cff", "#f8f8f8", "#19f2ff"];
    const stops = values.map((value, index) => {
      const start = cursor;
      cursor += (value / total) * 100;
      return `${colors[index]} ${start}% ${cursor}%`;
    });
    pie.style.background = `conic-gradient(${stops.join(", ")})`;
    setText("[data-pie-score]", `${Math.round(total / inputs.length)}%`);
  }

  document.querySelectorAll("[data-pie-input]").forEach((input) => {
    input.addEventListener("input", updateGrowthPie);
  });
  updateGrowthPie();

  const recommendationMap = {
    launch: "建議從 Professional 開始：先完成品牌定位、識別系統、轉換網站與 SEO 基礎，讓品牌能被搜尋、被理解、被詢問。",
    scale: "建議 Business 或 Premium：重整網站結構、加入內容策略、GA4/Search Console、AI 客服與 CRM 串接，提高詢問與成交效率。",
    immersive: "建議 Immersive Experience：用 3D 場景、Scroll Storytelling、互動案例宇宙與品牌數據中心，創造高記憶點與高端信任感。",
    automation: "建議 AI Automation 專案：建立 AI 客服、內容生成、LINE Bot、CRM 與工作流自動化，讓成長不只靠人力。",
    websiteContent: "內容主軸建議：企業官網費用、Landing Page 差異、網站改版流程、RWD 與網站速度，導向網站設計服務頁。",
    brandContent: "內容主軸建議：Logo 設計費用、品牌定位方法、CIS 規範、品牌手冊範例，導向品牌策略與識別服務。",
    seoContent: "內容主軸建議：SEO 健檢、Technical SEO、Schema、Blog 分類規劃、Search Console，導向 SEO / AI 頁。",
    aiContent: "內容主軸建議：AI 客服、AI Agent、LINE Bot、CRM 自動化、AI 商品圖，導向 AI Automation 諮詢。",
  };

  document.querySelectorAll("[data-recommend-option]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-recommend-option]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      setText("[data-recommend-output]", recommendationMap[button.dataset.recommendOption]);
    });
  });

  function updateSeoScore() {
    const checks = Array.from(document.querySelectorAll("[data-seo-check]"));
    if (!checks.length) return;
    const done = checks.filter((check) => check.checked).length;
    const score = Math.round((done / checks.length) * 100);
    const label =
      score >= 85
        ? "SEO 架構健康，下一步應該擴內容與轉換追蹤。"
        : score >= 55
          ? "SEO 基礎可用，但仍需要補 Schema、速度、內容群與 CTA。"
          : "SEO 成長阻力偏高，建議先做技術健檢與資訊架構重整。";
    setText("[data-seo-score]", `${score}`);
    setText("[data-seo-output]", label);
  }

  document.querySelectorAll("[data-seo-check]").forEach((check) => {
    check.addEventListener("change", updateSeoScore);
  });
  updateSeoScore();

  function updateRoi() {
    const visitors = Number(document.querySelector("[data-roi-visitors]")?.value || 0);
    const conversion = Number(document.querySelector("[data-roi-conversion]")?.value || 0) / 100;
    const value = Number(document.querySelector("[data-roi-value]")?.value || 0);
    const monthly = Math.round(visitors * conversion * value);
    const yearly = monthly * 12;
    setText("[data-roi-monthly]", `NT$${monthly.toLocaleString("zh-Hant-TW")}`);
    setText("[data-roi-yearly]", `NT$${yearly.toLocaleString("zh-Hant-TW")}`);
  }

  document.querySelectorAll("[data-roi-visitors], [data-roi-conversion], [data-roi-value]").forEach((input) => {
    input.addEventListener("input", updateRoi);
  });
  updateRoi();

  document.querySelectorAll("[data-case-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.caseFilter;
      document.querySelectorAll("[data-case-filter]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      document.querySelectorAll("[data-case-type]").forEach((item) => {
        item.hidden = filter !== "all" && item.dataset.caseType !== filter;
      });
    });
  });

  const contactForm = document.querySelector("[data-contact-form]");
  if (contactForm) {
    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(contactForm);
      const name = data.get("name") || "你的品牌";
      const service = data.get("service") || "品牌成長系統";
      const budget = data.get("budget") || "未填寫預算";
      const start = data.get("start") || "待討論";
      const summary = `${name} / ${service} / ${budget} / ${start}`;
      setText("[data-contact-summary]", summary);
      const mail = `mailto:hsinchucombat2022@gmail.com?subject=${encodeURIComponent("HCF VISUAL LAB 專案需求")}&body=${encodeURIComponent(summary)}`;
      const link = document.querySelector("[data-mail-link]");
      if (link) link.setAttribute("href", mail);
    });
  }
})();
